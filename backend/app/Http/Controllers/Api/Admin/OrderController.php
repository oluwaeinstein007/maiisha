<?php

namespace App\Http\Controllers\Api\Admin;

use App\Contracts\PaymentGateway;
use App\Contracts\ShippingProvider;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\DiscountCodeUsage;
use App\Models\Order;
use App\Services\OrderNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class OrderController extends Controller
{
    private const VALID_STATUSES = [
        Order::STATUS_PLACED,
        Order::STATUS_PROCESSING,
        Order::STATUS_SHIPPED,
        Order::STATUS_OUT_FOR_DELIVERY,
        Order::STATUS_DELIVERED,
        Order::STATUS_CANCELLED,
    ];

    /** Full detail (discount code, payment, per-item sale) is only worth loading for a single order. */
    private const DETAIL_RELATIONS = ['user', 'address', 'items.variant.product.images', 'items.sale', 'shipment', 'payment', 'discountCode'];

    public function index(Request $request)
    {
        $query = Order::query()->with(['user', 'items.variant.product.images'])->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        // Order number or the customer's name/email — whichever an admin has to hand.
        if ($request->filled('search')) {
            $term = '%'.$request->string('search').'%';
            $query->where(fn ($q) => $q
                ->where('order_number', 'like', $term)
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', $term)->orWhere('email', 'like', $term)));
        }

        return OrderResource::collection($query->paginate($request->integer('per_page', 20)));
    }

    public function show(Order $order)
    {
        return new OrderResource($order->load(self::DETAIL_RELATIONS));
    }

    public function updateStatus(
        Request $request,
        Order $order,
        ShippingProvider $shippingProvider,
        OrderNotifier $notifier,
    ) {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:'.implode(',', self::VALID_STATUSES)],
        ]);

        // Cancelling a paid order must return its stock — otherwise it's decremented
        // forever with no way back, same risk the Stripe webhook's failure path guards
        // against. Only restock once: skip if it was already cancelled.
        if ($data['status'] === Order::STATUS_CANCELLED && $order->status !== Order::STATUS_CANCELLED) {
            DB::transaction(function () use ($order) {
                $order->load('items.variant');

                foreach ($order->items as $item) {
                    $item->variant?->increment('stock_quantity', $item->quantity);
                }

                // Freeing the code is what lets this customer use it again — otherwise a
                // cancelled order permanently "spends" a single-use code for nothing.
                // Mirrors CheckoutController::releaseOrder() and the webhook's failure path.
                DiscountCodeUsage::where('order_id', $order->id)->delete();

                $order->update(['status' => Order::STATUS_CANCELLED]);
            });

            return new OrderResource($order->fresh(self::DETAIL_RELATIONS));
        }

        $order->update(['status' => $data['status']]);

        if ($data['status'] === Order::STATUS_SHIPPED) {
            if (! $order->shipment) {
                $shipmentData = $shippingProvider->createShipment($order);
                $order->shipment()->create([...$shipmentData, 'status' => 'in_transit']);
            }

            $order->update(['shipped_at' => now()]);
            $notifier->shipped($order->load('items', 'user'));
        }

        if ($data['status'] === Order::STATUS_OUT_FOR_DELIVERY) {
            $order->shipment?->update(['status' => Order::STATUS_OUT_FOR_DELIVERY]);
            $notifier->outForDelivery($order->load('items', 'user'));
        }

        if ($data['status'] === Order::STATUS_DELIVERED) {
            $order->update(['delivered_at' => now()]);
            $order->shipment?->update(['status' => 'delivered']);
            $notifier->delivered($order->load('items', 'user'));
        }

        return new OrderResource($order->load(self::DETAIL_RELATIONS));
    }

    /**
     * Refunds the order's payment through the gateway and, on success, restocks
     * it and marks it cancelled — the same end state a manual cancel reaches,
     * but with the customer's money actually returned rather than just the
     * founder's own status field saying "cancelled". Full refund only: there's
     * no partial-refund control in the admin yet.
     */
    public function refund(Order $order, PaymentGateway $gateway): JsonResponse|OrderResource
    {
        $order->loadMissing('payment');
        $payment = $order->payment;

        if (! in_array($order->status, Order::PAID_STATUSES, true) || ! $payment || $payment->status !== 'succeeded') {
            return response()->json([
                'message' => 'This order has no successful payment to refund.',
            ], 422);
        }

        try {
            $gateway->refund($payment->provider_reference);
        } catch (RuntimeException $e) {
            report($e);

            return response()->json([
                'message' => 'The refund could not be processed. Please try again in a moment, or refund it directly in Stripe.',
            ], 502);
        }

        DB::transaction(function () use ($order, $payment) {
            $order->load('items.variant');

            foreach ($order->items as $item) {
                $item->variant?->increment('stock_quantity', $item->quantity);
            }

            DiscountCodeUsage::where('order_id', $order->id)->delete();

            $payment->update(['status' => 'refunded']);
            $order->update(['status' => Order::STATUS_CANCELLED]);
        });

        return new OrderResource($order->fresh(self::DETAIL_RELATIONS));
    }
}
