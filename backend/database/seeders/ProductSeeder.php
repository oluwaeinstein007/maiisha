<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    private const PRODUCTS = [
        ['category' => 'Hair extensions & hair products', 'name' => 'Silky Clip-In Extensions', 'price' => 4999, 'sizes' => ['16"', '20"', '24"'], 'featured' => true],
        ['category' => 'Hair extensions & hair products', 'name' => 'Lace Front Wig — Bone Straight', 'price' => 12999, 'sizes' => ['16"', '20"'], 'featured' => false],
        ['category' => "Women's fashion", 'name' => 'Gold-Trim Wrap Dress', 'price' => 6499, 'sizes' => ['S', 'M', 'L', 'XL'], 'featured' => true],
        ['category' => "Women's fashion", 'name' => 'Satin Blouse — Noir', 'price' => 3499, 'sizes' => ['S', 'M', 'L'], 'featured' => false],
        ['category' => 'Activewear', 'name' => 'Seamless Gym Set', 'price' => 4299, 'sizes' => ['S', 'M', 'L'], 'featured' => true],
        ['category' => 'Islamic / modest wear', 'name' => 'Embellished Abaya — Black & Gold', 'price' => 8999, 'sizes' => ['S', 'M', 'L', 'XL'], 'featured' => true],
        ['category' => 'Islamic / modest wear', 'name' => 'Premium Chiffon Hijab', 'price' => 1499, 'sizes' => ['One Size'], 'featured' => false],
        ['category' => 'Beauty products', 'name' => 'Radiance Skincare Set', 'price' => 5499, 'sizes' => ['One Size'], 'featured' => true],
        ['category' => 'Beauty products', 'name' => 'Matte Lipstick — Rich Gold Case', 'price' => 1899, 'sizes' => ['One Size'], 'featured' => false],
        ['category' => 'Accessories', 'name' => 'Structured Tote Bag', 'price' => 5999, 'sizes' => ['One Size'], 'featured' => false],
        ['category' => 'Accessories', 'name' => 'Layered Gold Necklace', 'price' => 2999, 'sizes' => ['One Size'], 'featured' => true],
        ['category' => "Men's wear", 'name' => 'Tailored Kaftan', 'price' => 7499, 'sizes' => ['M', 'L', 'XL'], 'featured' => false],
        ['category' => "Baby's wear", 'name' => 'Organic Cotton Romper', 'price' => 1799, 'sizes' => ['0-3m', '3-6m', '6-12m'], 'featured' => false],
        ['category' => 'Shoes', 'name' => 'Block Heel Sandals', 'price' => 5499, 'sizes' => ['UK 4', 'UK 5', 'UK 6', 'UK 7'], 'featured' => true],
    ];

    public function run(): void
    {
        foreach (self::PRODUCTS as $i => $def) {
            $category = Category::where('name', $def['category'])->whereNull('parent_id')->first();

            $product = Product::create([
                'category_id' => $category->id,
                'name' => $def['name'],
                'slug' => Str::slug($def['name']),
                'description' => "Premium {$def['name']} from the MAI_ISHA collection — polished, on-brand black & gold quality.",
                'price_pence' => $def['price'],
                'is_active' => true,
                'is_featured' => $def['featured'],
            ]);

            $product->images()->create([
                'path' => "https://picsum.photos/seed/maiisha-{$i}/800/1000",
                'alt_text' => $def['name'],
                'sort_order' => 0,
            ]);

            foreach ($def['sizes'] as $j => $size) {
                $product->variants()->create([
                    'sku' => 'MAI-'.str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT).'-'.str_pad((string) ($j + 1), 2, '0', STR_PAD_LEFT),
                    'size' => $size,
                    'stock_quantity' => $j === 0 ? 3 : 20,
                    'low_stock_threshold' => 5,
                ]);
            }
        }
    }
}
