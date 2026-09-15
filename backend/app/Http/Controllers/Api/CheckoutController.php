<?php

namespace App\Http\Controllers\Api;

use App\Contracts\PaymentGateway;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Address;
use App\Models\DiscountCode;
use App\Models\DiscountCodeUsage;
use App\Models\Order;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Services\VatCalculator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class CheckoutController extends Controller
{
    private const FREE_SHIPPING_THRESHOLD_PENCE = 5000;

    private const FLAT_SHIPPING_PENCE = 399;

    public function __construct(
        private readonly VatCalculator $vatCalculator,
        private readonly PaymentGateway $paymentGateway,
    ) {}

    /**
     * Compute an itemised total (FR-8) without creating an order or touching
     * stock — used by the checkout page to preview totals as the customer
     * enters an address / applies a discount code.
     */
    public function preview(Request $request)
    {
        $data = $request->validate([
            'discount_code' => ['nullable', 'string'],
        ]);

        $cart = app(CartController::class)->resolveCart($request);
        $cart->load('items.variant.product');

        if ($cart->items->isEmpty()) {
            throw ValidationException::withMessages(['cart' => 'Your cart is empty.']);
        }

        [$subtotal, $discountPence, $shipping, $vat, $total, , $error] = $this->calculateTotals(
            $cart, $data['discount_code'] ?? null
        );

        if ($error) {
            throw ValidationException::withMessages(['discount_code' => $error]);
        }

        return response()->json([
            'subtotal_pence' => $subtotal,
            'discount_pence' => $discountPence,
            'shipping_pence' => $shipping,
            'vat_pence' => $vat,
            'total_pence' => $total,
            'vat_rate' => $this->vatCalculator->rate(),
        ]);
    }

    /**
     * Create the order (reserving stock) and a Stripe PaymentIntent for it
     * (FR-8/FR-10). The order starts as pending_payment; the webhook flips
     * it to placed once Stripe confirms the charge.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'address_id' => ['required', 'exists:addresses,id'],
            'discount_code' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $address = Address::findOrFail($data['address_id']);
        abort_unless($address->user_id === $user->id, 403);

        $cart = app(CartController::class)->resolveCart($request);
        $cart->load('items.variant.product');

        if ($cart->items->isEmpty()) {
            throw ValidationException::withMessages(['cart' => 'Your cart is empty.']);
        }

        foreach ($cart->items as $item) {
            if (! $item->variant->is_active || $item->quantity > $item->variant->stock_quantity) {
                throw ValidationException::withMessages([
                    'cart' => "{$item->variant->product->name} is no longer available in that quantity.",
                ]);
            }
        }

        [$subtotal, $discountPence, $shipping, $vat, $total, $discountCode, $error] = $this->calculateTotals(
            $cart, $data['discount_code'] ?? null
        );

        if ($error) {
            throw ValidationException::withMessages(['discount_code' => $error]);
        }

        $order = DB::transaction(function () use ($user, $address, $cart, $subtotal, $discountPence, $shipping, $vat, $total, $discountCode) {
            $order = Order::create([
                'order_number' => $this->generateOrderNumber(),
                'user_id' => $user->id,
                'address_id' => $address->id,
                'discount_code_id' => $discountCode?->id,
                'status' => Order::STATUS_PENDING_PAYMENT,
                'subtotal_pence' => $subtotal,
                'discount_pence' => $discountPence,
                'vat_pence' => $vat,
                'shipping_pence' => $shipping,
                'total_pence' => $total,
                'currency' => 'GBP',
            ]);

            foreach ($cart->items as $item) {
                $order->items()->create([
                    'product_variant_id' => $item->variant->id,
                    'product_name' => $item->variant->product->name,
                    'sku' => $item->variant->sku,
                    'size' => $item->variant->size,
                    'colour' => $item->variant->colour,
                    'unit_price_pence' => $item->variant->priceInPence(),
                    'quantity' => $item->quantity,
                    'line_total_pence' => $item->quantity * $item->variant->priceInPence(),
                ]);

                // Stock is reserved at order creation, not at payment success, so two
                // customers can't both "win" the last unit during the payment step.
                // The WHERE clauses make this a single atomic "decrement iff still
                // available" statement — the earlier in-memory check above is just a
                // fast-fail UX nicety and can't be relied on under concurrent requests.
                $decremented = ProductVariant::where('id', $item->variant->id)
                    ->where('is_active', true)
                    ->where('stock_quantity', '>=', $item->quantity)
                    ->decrement('stock_quantity', $item->quantity);

                if (! $decremented) {
                    throw ValidationException::withMessages([
                        'cart' => "{$item->variant->product->name} is no longer available in that quantity.",
                    ]);
                }
            }

            if ($discountCode) {
                $discountCode->usages()->create([
                    'user_id' => $user->id,
                    'order_id' => $order->id,
                ]);
            }

            $cart->items()->delete();

            return $order;
        });

        try {
            $intent = $this->paymentGateway->createPaymentIntent(
                $order->total_pence,
                $order->currency,
                ['order_id' => $order->id, 'order_number' => $order->order_number],
            );
        } catch (RuntimeException $e) {
            // Don't strand a reserved-stock order if the payment gateway is unreachable/misconfigured.
            $this->releaseOrder($order);

            report($e);

            throw ValidationException::withMessages([
                'checkout' => 'We could not start payment. Please try again in a moment.',
            ]);
        }

        Payment::create([
            'order_id' => $order->id,
            'provider' => 'stripe',
            'provider_reference' => $intent['id'],
            'status' => 'pending',
            'amount_pence' => $order->total_pence,
            'currency' => $order->currency,
        ]);

        return response()->json([
            'order' => new OrderResource($order->load('items')),
            'client_secret' => $intent['client_secret'],
        ]);
    }

    private function releaseOrder(Order $order): void
    {
        DB::transaction(function () use ($order) {
            $order->load('items.variant');

            foreach ($order->items as $item) {
                $item->variant?->increment('stock_quantity', $item->quantity);
            }

            DiscountCodeUsage::where('order_id', $order->id)->delete();

            $order->update(['status' => Order::STATUS_CANCELLED]);
        });
    }

    /**
     * @return array{0: int, 1: int, 2: int, 3: int, 4: int, 5: ?DiscountCode, 6: ?string}
     */
    private function calculateTotals($cart, ?string $discountCodeInput): array
    {
        $subtotal = $cart->subtotalPence();
        $discountCode = null;
        $discountPence = 0;
        $error = null;

        if ($discountCodeInput) {
            // Codes are stored uppercased (see Admin\DiscountCodeController) — match
            // case-insensitively so "save10" works the same as "SAVE10".
            $discountCode = DiscountCode::where('code', strtoupper($discountCodeInput))->first();

            if (! $discountCode || ! $discountCode->isValid()) {
                $error = 'This discount code is invalid or has expired.';
            } else {
                $discountPence = $discountCode->discountPenceFor($subtotal);
            }
        }

        $shipping = $subtotal >= self::FREE_SHIPPING_THRESHOLD_PENCE ? 0 : self::FLAT_SHIPPING_PENCE;
        $taxableTotal = max(0, $subtotal - $discountPence) + $shipping;
        $vat = $this->vatCalculator->vatPenceFromInclusive($taxableTotal);
        $total = $taxableTotal;

        return [$subtotal, $discountPence, $shipping, $vat, $total, $discountCode, $error];
    }

    private function generateOrderNumber(): string
    {
        do {
            $candidate = 'MAI-'.now()->format('Ymd').'-'.strtoupper(Str::random(6));
        } while (Order::where('order_number', $candidate)->exists());

        return $candidate;
    }
}
