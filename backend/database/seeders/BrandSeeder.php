<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class BrandSeeder extends Seeder
{
    /**
     * Demo brands (invented — no real trademarks) and the top-level category whose
     * products each one gets. Keyed by slug so re-running `db:seed` updates in place.
     *
     * @var list<array{slug: string, name: string, description: string, category: string, order: int}>
     */
    private const BRANDS = [
        ['slug' => 'maiisha-signature', 'name' => 'MAI_ISHA Signature', 'description' => 'Our own label: premium everyday and occasion wear.', 'category' => 'womens-fashion', 'order' => 1],
        ['slug' => 'adaeze-hair', 'name' => 'Adaeze Hair', 'description' => 'Wigs, clip-ins and hair care, made to last.', 'category' => 'hair-extensions-hair-products', 'order' => 2],
        ['slug' => 'noor-modest', 'name' => 'Noor Modest', 'description' => 'Abayas, hijabs and modest wear with gold-trim detail.', 'category' => 'islamic-modest-wear', 'order' => 3],
        ['slug' => 'zuri-beauty', 'name' => 'Zuri Beauty', 'description' => 'Skincare and colour made for melanin-rich skin.', 'category' => 'beauty-products', 'order' => 4],
        ['slug' => 'kente-active', 'name' => 'Kente Active', 'description' => 'Performance activewear that looks as good as it works.', 'category' => 'activewear', 'order' => 5],
        ['slug' => 'agbada-house', 'name' => 'Agbada House', 'description' => 'Tailored menswear for weddings and celebrations.', 'category' => 'mens-wear', 'order' => 6],
        ['slug' => 'little-blessings', 'name' => 'Little Blessings', 'description' => 'Soft, gentle pieces for little ones.', 'category' => 'babys-wear', 'order' => 7],
        ['slug' => 'stride-and-co', 'name' => 'Stride & Co', 'description' => 'Heels, flats and boots for every occasion.', 'category' => 'shoes', 'order' => 8],
        ['slug' => 'gilt-and-co', 'name' => 'Gilt & Co', 'description' => 'Jewellery and accessories with a golden finish.', 'category' => 'accessories', 'order' => 9],
    ];

    public function run(): void
    {
        $parents = Category::query()->pluck('parent_id', 'id')->all();

        foreach (self::BRANDS as $definition) {
            $brand = Brand::updateOrCreate(
                ['slug' => $definition['slug']],
                [
                    'name' => $definition['name'],
                    'description' => $definition['description'],
                    'is_active' => true,
                    'sort_order' => $definition['order'],
                ],
            );

            $category = Category::where('slug', $definition['category'])->first();

            if ($category === null) {
                continue;
            }

            // Only products without a brand yet — never overwrite a choice made in the admin.
            Product::query()
                ->whereNull('brand_id')
                ->whereIn('category_id', Category::idsWithDescendants([$category->id], $parents))
                ->update(['brand_id' => $brand->id]);
        }
    }
}
