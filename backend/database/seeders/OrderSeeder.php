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
     * Items are [product name, variant size, colour, quantity] — looked up by
     * name/size/colour at runtime (see run()) rather than by position, so this
     * doesn't break if ProductSeeder's catalogue is reordered or expanded.
     * Colour is required whenever the product has more than one colourway,
     * since size alone is ambiguous across colours.
     */
    private const ORDERS = [
        ['customer' => 0, 'status' => Order::STATUS_DELIVERED, 'placedDaysAgo' => 21, 'items' => [['Silky Clip-In Extensions', '24"', 'Natural Black', 2], ['Argan Oil Hair Treatment', '100ml', null, 1]], 'discountCode' => 'WELCOME10'],
        ['customer' => 1, 'status' => Order::STATUS_DELIVERED, 'placedDaysAgo' => 18, 'items' => [['Gold-Trim Wrap Dress', 'M', 'Black', 1], ['Statement Hoop Earrings', 'One Size', 'Gold', 1]]],
        ['customer' => 2, 'status' => Order::STATUS_SHIPPED, 'placedDaysAgo' => 6, 'items' => [['Satin Blouse — Noir', 'S', 'Black', 1], ['Pleated Maxi Dress', 'M', 'Emerald', 3]]],
        ['customer' => 3, 'status' => Order::STATUS_SHIPPED, 'placedDaysAgo' => 4, 'items' => [['Embellished Abaya — Black & Gold', 'L', 'Black', 1], ['Premium Chiffon Hijab', 'One Size', 'Black', 2], ['Jersey Hijab Set — 3 Pack', 'One Size', null, 1]]],
        ['customer' => 4, 'status' => Order::STATUS_PROCESSING, 'placedDaysAgo' => 2, 'items' => [['Lace Front Wig — Bone Straight', '20"', 'Natural Black', 1], ['Premium Chiffon Hijab', 'One Size', 'Navy', 2]]],
        ['customer' => 5, 'status' => Order::STATUS_PLACED, 'placedDaysAgo' => 1, 'items' => [['Radiance Skincare Set', 'One Size', null, 1], ['Vitamin C Brightening Serum', '30ml', null, 1], ['Shea Butter Body Cream', '200ml', null, 2]]],
        ['customer' => 6, 'status' => Order::STATUS_PLACED, 'placedDaysAgo' => 0, 'items' => [['High-Waist Leggings — Charcoal', 'M', 'Charcoal', 2], ['Cropped Sports Hoodie', 'M', 'Grey', 1]]],
        ['customer' => 7, 'status' => Order::STATUS_CANCELLED, 'placedDaysAgo' => 10, 'items' => [['Structured Tote Bag', 'One Size', 'Black', 1]]],
        ['customer' => 8, 'status' => Order::STATUS_DELIVERED, 'placedDaysAgo' => 30, 'items' => [['Statement Ankle Boots', 'UK 5', 'Black', 1], ['Block Heel Sandals', 'UK 5', 'Nude', 1], ['Layered Gold Necklace', 'One Size', 'Gold', 1]]],
        ['customer' => 9, 'status' => Order::STATUS_DELIVERED, 'placedDaysAgo' => 14, 'items' => [['Slim-Fit Agbada Set', 'L', 'Black', 1], ['Premium Cotton Thobe', 'L', 'White', 2]]],
        ['customer' => 10, 'status' => Order::STATUS_PROCESSING, 'placedDaysAgo' => 1, 'items' => [['Longwear Liquid Foundation', 'One Size', 'Medium', 1], ['Matte Lipstick — Rich Gold Case', 'One Size', 'Ruby Red', 1], ['Gold Shimmer Eyeshadow Palette', 'One Size', null, 1]]],
    ];

    public function run(): void
    {
        $customers = User::where('role', 'customer')->orderBy('id')->get();
        $productCount = Product::count();

        if ($customers->count() < 11 || $productCount < 11) {
            $this->command?->warn('OrderSeeder: not enough customers/products seeded, skipping.');

            return;
        }

        // This seeder has no natural unique key to updateOrCreate against (order
        // numbers are randomly generated per run) — re-running `db:seed` would
        // just pile up a second copy of the same demo history. Since its only
        // job is to seed that fixed demo history once, bail out if it looks like
        // it already has.
        if (Order::where('user_id', $customers->first()->id)->exists()) {
            $this->command?->warn('OrderSeeder: demo orders already exist, skipping.');

            return;
        }

        $vat = app(VatCalculator::class);

        foreach (self::ORDERS as $def) {
            $user = $customers[$def['customer']];
            $address = $user->addresses()->first();

            $placedAt = now()->subDays($def['placedDaysAgo']);

            $lines = [];
            $subtotal = 0;

            foreach ($def['items'] as [$productName, $size, $colour, $qty]) {
                $variant = Product::where('name', $productName)->firstOrFail()
                    ->variants()
                    ->where('size', $size)
                    ->when($colour !== null, fn ($q) => $q->where('colour', $colour))
                    ->firstOrFail();
                // Priced as of the day it was placed, so an order from inside a past
                // sale window carries that sale's price (and the sale that gave it).
                $quote = $variant->quote($placedAt);

                // A sale can't have priced an order placed before the sale existed.
                if ($quote['sale'] && $quote['sale']->created_at->gt($placedAt)) {
                    $quote = ['price' => $quote['original'], 'original' => $quote['original'], 'sale' => null];
                }

                $unitPrice = $quote['price'];
                $lineTotal = $unitPrice * $qty;
                $subtotal += $lineTotal;

                $lines[] = [
                    'product_variant_id' => $variant->id,
                    'product_name' => $productName,
                    'sku' => $variant->sku,
                    'size' => $variant->size,
                    'colour' => $variant->colour,
                    'unit_price_pence' => $unitPrice,
                    'original_unit_price_pence' => $quote['sale'] ? $quote['original'] : null,
                    'sale_id' => $quote['sale']?->id,
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
