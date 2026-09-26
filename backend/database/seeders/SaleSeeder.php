<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Services\SalePricing;
use Carbon\CarbonInterface;
use Illuminate\Database\Seeder;

class SaleSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        // Keyed by name so re-running `db:seed` updates in place instead of duplicating.
        // Each sale is backdated to when it "started", so OrderSeeder (which prices demo
        // orders as of the day they were placed) never gives an order a sale that didn't exist yet.

        // Past, with dates: gives analytics a "sale performance" story — the demo orders
        // placed inside this window carry the sale price.
        $this->sale('Summer Clearance', [
            'description' => '15% off everything while stocks last',
            'value' => 15,
            'starts_at' => $now->copy()->subDays(24),
            'ends_at' => $now->copy()->subDays(13),
        ], createdAt: $now->copy()->subDays(24));

        // Live and MANUAL: no dates — it runs until someone switches it off.
        $this->sale('Autumn Style Sale', [
            'description' => '20% off shoes & accessories',
            'value' => 20,
        ], categories: ['shoes', 'accessories'], createdAt: $now->copy()->subDays(3));

        // Recurring by weekday: every Monday (UK time), no end date.
        $this->sale('Monday Deals', [
            'description' => 'Every Monday: 10% off beauty',
            'value' => 10,
            'active_weekdays' => [1],
        ], categories: ['beauty-products'], createdAt: $now->copy()->subDays(60));

        // Seasonal campaigns are NOT automatic: they sit here as inactive drafts, with no
        // dates, until the founder fills them in and switches them on.
        $this->sale('Christmas Sale', [
            'description' => 'Up to 25% off sitewide',
            'value' => 25,
            'is_active' => false,
        ], createdAt: $now->copy()->subDays(2));

        $this->sale('Ileya Sale', [
            'description' => 'Celebrate Ileya: 15% off modest wear',
            'value' => 15,
            'is_active' => false,
        ], categories: ['islamic-modest-wear'], brands: ['noor-modest'], createdAt: $now->copy()->subDays(2));

        $this->sale('Black Friday', [
            'description' => 'Our biggest deals of the year',
            'value' => 30,
            'is_active' => false,
        ], categories: ['shoes'], products: [
            'Gold-Trim Wrap Dress', 'Faux-Leather Trench Coat', 'Seamless Gym Set',
            'Statement Hoop Earrings', 'Radiance Skincare Set', 'Silky Clip-In Extensions',
        ], createdAt: $now->copy()->subDays(2));

        // sync() fires no model events, so drop any prices computed before it ran.
        app(SalePricing::class)->flush();
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @param  list<string>  $categories  category slugs (lines)
     * @param  list<string>  $brands  brand slugs
     * @param  list<string>  $products  product names
     */
    private function sale(
        string $name,
        array $attributes,
        array $categories = [],
        array $brands = [],
        array $products = [],
        ?CarbonInterface $createdAt = null,
    ): void {
        $categoryIds = Category::whereIn('slug', $categories)->pluck('id')->all();
        $brandIds = Brand::whereIn('slug', $brands)->pluck('id')->all();
        $productIds = Product::whereIn('name', $products)->pluck('id')->all();
        $selected = $categoryIds !== [] || $brandIds !== [] || $productIds !== [];

        $sale = Sale::updateOrCreate(['name' => $name], $attributes + [
            'type' => Sale::TYPE_PERCENTAGE,
            'applies_to' => $selected ? Sale::APPLIES_TO_SELECTED : Sale::APPLIES_TO_ALL,
            'starts_at' => null,
            'ends_at' => null,
            'active_weekdays' => null,
            'is_active' => true,
        ]);

        $sale->categories()->sync($categoryIds);
        $sale->brands()->sync($brandIds);
        $sale->products()->sync($productIds);

        if ($createdAt !== null) {
            $sale->forceFill(['created_at' => $createdAt])->save();
        }
    }
}
