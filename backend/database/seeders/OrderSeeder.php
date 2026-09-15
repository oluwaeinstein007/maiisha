<?php

namespace Database\Seeders;

use App\Models\DiscountCode;
use App\Models\Order;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Models\Shipment;
use App\Models\User;
use App\Services\VatCalculator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class OrderSeeder extends Seeder
{
    private const FREE_SHIPPING_THRESHOLD_PENCE = 5000;

    private const FLAT_SHIPPING_PENCE = 399;

    /**
     * customer index (into CustomerSeeder's list, by creation order) => order definition.
     * Variant picks are by product/variant index within all in-stock variants, so this
     * stays readable without hardcoding SKUs that could shift.
     */
    private const ORDERS = [
        ['customer' => 0, 'status' => Order::STATUS_DELIVERED, 'placedDaysAgo' => 21, 'items' => [[0, 2], [4, 1]], 'discountCode' => 'WELCOME10'],
        ['customer' => 1, 'status' => Order::STATUS_DELIVERED, 'placedDaysAgo' => 18, 'items' => [[2, 1]]],
        ['customer' => 2, 'status' => Order::STATUS_SHIPPED, 'placedDaysAgo' => 6, 'items' => [[5, 1], [6, 3]]],
        ['customer' => 3, 'status' => Order::STATUS_SHIPPED, 'placedDaysAgo' => 4, 'items' => [[9, 1]]],
        ['customer' => 4, 'status' => Order::STATUS_PROCESSING, 'placedDaysAgo' => 2, 'items' => [[1, 1], [10, 2]]],
        ['customer' => 5, 'status' => Order::STATUS_PLACED, 'placedDaysAgo' => 1, 'items' => [[7, 1]]],
        ['customer' => 6, 'status' => Order::STATUS_PLACED, 'placedDaysAgo' => 0, 'items' => [[3, 2]]],
        ['customer' => 7, 'status' => Order::STATUS_CANCELLED, 'placedDaysAgo' => 10, 'items' => [[8, 1]]],
    ];

    public function run(): void
    {
        $customers = User::where('role', 'customer')->orderBy('id')->get();
        $variants = ProductVariant::with('product')->orderBy('id')->get()->values();

        if ($customers->count() < 8 || $variants->count() < 11) {
            $this->command?->warn('OrderSeeder: not enough customers/variants seeded, skipping.');

            return;
        }

        $vat = app(VatCalculator::class);

        foreach (self::ORDERS as $def) {
            $user = $customers[$def['customer']];
            $address = $user->addresses()->first();

            $lines = [];
            $subtotal = 0;

            foreach ($def['items'] as [$variantIndex, $qty]) {
                $variant = $variants[$variantIndex];
                $unitPrice = $variant->priceInPence();
                $lineTotal = $unitPrice * $qty;
                $subtotal += $lineTotal;

                $lines[] = [
                    'product_variant_id' => $variant->id,
                    'product_name' => $variant->product->name,
                    'sku' => $variant->sku,
                    'size' => $variant->size,
                    'colour' => $variant->colour,
                    'unit_price_pence' => $unitPrice,
                    'quantity' => $qty,
                    'line_total_pence' => $lineTotal,
                ];
            }

            $discountCode = isset($def['discountCode'])
                ? DiscountCode::where('code', $def['discountCode'])->first()
                : null;
            $discountPence = $discountCode ? $discountCode->discountPenceFor($subtotal) : 0;

            $shipping = $subtotal >= self::FREE_SHIPPING_THRESHOLD_PENCE ? 0 : self::FLAT_SHIPPING_PENCE;
            $taxableTotal = max(0, $subtotal - $discountPence) + $shipping;
            $vatPence = $vat->vatPenceFromInclusive($taxableTotal);

            $placedAt = now()->subDays($def['placedDaysAgo']);

            $order = Order::create([
                'order_number' => 'MAI-'.$placedAt->format('Ymd').'-'.strtoupper(Str::random(6)),
                'user_id' => $user->id,
                'address_id' => $address?->id,
                'discount_code_id' => $discountCode?->id,
                'status' => $def['status'],
                'subtotal_pence' => $subtotal,
                'discount_pence' => $discountPence,
                'vat_pence' => $vatPence,
                'shipping_pence' => $shipping,
                'total_pence' => $taxableTotal,
                'currency' => 'GBP',
                'shipped_at' => in_array($def['status'], [Order::STATUS_SHIPPED, Order::STATUS_DELIVERED], true) ? $placedAt->copy()->addDay() : null,
                'delivered_at' => $def['status'] === Order::STATUS_DELIVERED ? $placedAt->copy()->addDays(4) : null,
            ]);

            // order_number/status timestamps are backdated for a realistic order
            // history; created_at/updated_at aren't mass-assignable, so set them directly.
            $order->forceFill(['created_at' => $placedAt, 'updated_at' => $placedAt])->save();

            foreach ($lines as $line) {
                $order->items()->create($line);
            }

            if ($discountCode) {
                $discountCode->usages()->create([
                    'user_id' => $user->id,
                    'order_id' => $order->id,
                ]);
            }

            Payment::create([
                'order_id' => $order->id,
                'provider' => 'stripe',
                'provider_reference' => 'pi_seed_'.Str::lower(Str::random(16)),
                'status' => $def['status'] === Order::STATUS_CANCELLED ? 'refunded' : 'succeeded',
                'amount_pence' => $taxableTotal,
                'currency' => 'GBP',
            ]);

            if (in_array($def['status'], [Order::STATUS_SHIPPED, Order::STATUS_DELIVERED], true)) {
                Shipment::create([
                    'order_id' => $order->id,
                    'courier' => 'royal_mail',
                    'tracking_number' => 'RM'.strtoupper(Str::random(9)).'GB',
                    'tracking_url' => 'https://www.royalmail.com/track-your-item',
                    'status' => $def['status'] === Order::STATUS_DELIVERED ? 'delivered' : 'in_transit',
                ]);
            }
        }
    }
}
