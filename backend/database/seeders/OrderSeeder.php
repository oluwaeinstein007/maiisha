<?php

namespace Database\Seeders;

use App\Models\DiscountCode;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
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
     * Items are [product name, variant size, quantity] — looked up by name/size at
     * runtime (see run()) rather than by position, so this doesn't break if
     * ProductSeeder's catalogue is reordered or expanded.
     */
    private const ORDERS = [
        ['customer' => 0, 'status' => Order::STATUS_DELIVERED, 'placedDaysAgo' => 21, 'items' => [['Silky Clip-In Extensions', '24"', 2], ['Argan Oil Hair Treatment', '100ml', 1]], 'discountCode' => 'WELCOME10'],
        ['customer' => 1, 'status' => Order::STATUS_DELIVERED, 'placedDaysAgo' => 18, 'items' => [['Gold-Trim Wrap Dress', 'M', 1]]],
        ['customer' => 2, 'status' => Order::STATUS_SHIPPED, 'placedDaysAgo' => 6, 'items' => [['Satin Blouse — Noir', 'S', 1], ['Pleated Maxi Dress', 'M', 3]]],
        ['customer' => 3, 'status' => Order::STATUS_SHIPPED, 'placedDaysAgo' => 4, 'items' => [['Embellished Abaya — Black & Gold', 'L', 1]]],
        ['customer' => 4, 'status' => Order::STATUS_PROCESSING, 'placedDaysAgo' => 2, 'items' => [['Lace Front Wig — Bone Straight', '20"', 1], ['Premium Chiffon Hijab', 'One Size', 2]]],
        ['customer' => 5, 'status' => Order::STATUS_PLACED, 'placedDaysAgo' => 1, 'items' => [['Radiance Skincare Set', 'One Size', 1]]],
        ['customer' => 6, 'status' => Order::STATUS_PLACED, 'placedDaysAgo' => 0, 'items' => [['High-Waist Leggings — Charcoal', 'M', 2]]],
        ['customer' => 7, 'status' => Order::STATUS_CANCELLED, 'placedDaysAgo' => 10, 'items' => [['Structured Tote Bag', 'One Size', 1]]],
    ];

    public function run(): void
    {
        $customers = User::where('role', 'customer')->orderBy('id')->get();
        $productCount = Product::count();

        if ($customers->count() < 8 || $productCount < 11) {
            $this->command?->warn('OrderSeeder: not enough customers/products seeded, skipping.');

            return;
        }

        $vat = app(VatCalculator::class);

        foreach (self::ORDERS as $def) {
            $user = $customers[$def['customer']];
            $address = $user->addresses()->first();

            $lines = [];
            $subtotal = 0;

            foreach ($def['items'] as [$productName, $size, $qty]) {
                $variant = Product::where('name', $productName)->firstOrFail()
                    ->variants()->where('size', $size)->firstOrFail();
                $unitPrice = $variant->priceInPence();
                $lineTotal = $unitPrice * $qty;
                $subtotal += $lineTotal;

                $lines[] = [
                    'product_variant_id' => $variant->id,
                    'product_name' => $productName,
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
