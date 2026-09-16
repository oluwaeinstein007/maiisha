<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    /**
     * Real, hand-picked representative photos (Unsplash/Pexels, free license),
     * pinned to specific photo IDs rather than a random/tag-based search —
     * that previously returned unrelated content (e.g. a "wig" search
     * finding nothing) or broke when the photo host was unreachable. One
     * photo is shared across the few product variants of that same garment
     * type, since there's no per-SKU photography yet.
     */
    private const IMG_HAIRWIG = 'https://images.unsplash.com/photo-1634315775834-3e1ac73de6b6';

    private const IMG_HAIRCARE = 'https://images.unsplash.com/photo-1768881187102-ca0131989c8a';

    private const IMG_DRESS = 'https://images.unsplash.com/photo-1555685885-81b8bd9edf70';

    private const IMG_BLOUSE = 'https://images.unsplash.com/photo-1704775983658-2773a9c0cce2';

    private const IMG_OUTERWEAR = 'https://images.unsplash.com/photo-1657697722009-4497fd0c2e14';

    private const IMG_ACTIVEWEAR = 'https://images.unsplash.com/photo-1584863495140-a320b13a11a8';

    private const IMG_ABAYA = 'https://images.unsplash.com/photo-1544059529-9a9a0a4ef94f';

    private const IMG_HIJAB = 'https://images.unsplash.com/photo-1573511869011-e36d6aa428da';

    private const IMG_SKINCARE = 'https://images.unsplash.com/photo-1768881187102-ca0131989c8a';

    private const IMG_MAKEUP = 'https://images.unsplash.com/photo-1626895872564-b691b6877b83';

    private const IMG_BAG = 'https://images.unsplash.com/photo-1567744875520-cf9c27fbb53b';

    private const IMG_JEWELLERY = 'https://images.unsplash.com/photo-1758995115682-1452a1a9e35b';

    private const IMG_MENSWEAR = 'https://images.pexels.com/photos/8526759/pexels-photo-8526759.jpeg';

    private const IMG_BABY = 'https://images.unsplash.com/photo-1617331140180-e8262094733a';

    private const IMG_SHOES = 'https://images.unsplash.com/photo-1601332170248-9f8f9bfea1cd';

    private const PRODUCTS = [
        // Hair extensions & hair products
        ['category' => 'Hair extensions & hair products', 'name' => 'Silky Clip-In Extensions', 'price' => 4999, 'sizes' => ['16"', '20"', '24"'], 'featured' => true, 'image' => self::IMG_HAIRWIG],
        ['category' => 'Hair extensions & hair products', 'name' => 'Lace Front Wig — Bone Straight', 'price' => 12999, 'sizes' => ['16"', '20"'], 'featured' => false, 'image' => self::IMG_HAIRWIG],
        ['category' => 'Hair extensions & hair products', 'name' => 'Kinky Curly Clip-In Set', 'price' => 5499, 'sizes' => ['16"', '20"', '24"'], 'featured' => false, 'image' => self::IMG_HAIRWIG],
        ['category' => 'Hair extensions & hair products', 'name' => 'Full Lace Wig — Deep Wave', 'price' => 14999, 'sizes' => ['18"', '22"'], 'featured' => true, 'image' => self::IMG_HAIRWIG],
        ['category' => 'Hair extensions & hair products', 'name' => 'Argan Oil Hair Treatment', 'price' => 1299, 'sizes' => ['100ml'], 'featured' => false, 'image' => self::IMG_HAIRCARE],
        ['category' => 'Hair extensions & hair products', 'name' => 'Edge Control & Wig Cap Set', 'price' => 999, 'sizes' => ['One Size'], 'featured' => false, 'image' => self::IMG_HAIRWIG],

        // Women's fashion
        ['category' => "Women's fashion", 'name' => 'Gold-Trim Wrap Dress', 'price' => 6499, 'sizes' => ['S', 'M', 'L', 'XL'], 'featured' => true, 'image' => self::IMG_DRESS],
        ['category' => "Women's fashion", 'name' => 'Satin Blouse — Noir', 'price' => 3499, 'sizes' => ['S', 'M', 'L'], 'featured' => false, 'image' => self::IMG_BLOUSE],
        ['category' => "Women's fashion", 'name' => 'Pleated Maxi Dress', 'price' => 5999, 'sizes' => ['S', 'M', 'L', 'XL'], 'featured' => false, 'image' => self::IMG_DRESS],
        ['category' => "Women's fashion", 'name' => 'Puff-Sleeve Blouse — Ivory', 'price' => 3299, 'sizes' => ['S', 'M', 'L'], 'featured' => false, 'image' => self::IMG_BLOUSE],
        ['category' => "Women's fashion", 'name' => 'Faux-Leather Trench Coat', 'price' => 8999, 'sizes' => ['S', 'M', 'L', 'XL'], 'featured' => true, 'image' => self::IMG_OUTERWEAR],
        ['category' => "Women's fashion", 'name' => 'Tailored Wool Blazer', 'price' => 7499, 'sizes' => ['S', 'M', 'L'], 'featured' => false, 'image' => self::IMG_OUTERWEAR],

        // Activewear
        ['category' => 'Activewear', 'name' => 'Seamless Gym Set', 'price' => 4299, 'sizes' => ['S', 'M', 'L'], 'featured' => true, 'image' => self::IMG_ACTIVEWEAR],
        ['category' => 'Activewear', 'name' => 'High-Waist Leggings — Charcoal', 'price' => 2799, 'sizes' => ['S', 'M', 'L', 'XL'], 'featured' => false, 'image' => self::IMG_ACTIVEWEAR],
        ['category' => 'Activewear', 'name' => 'Cropped Sports Hoodie', 'price' => 3199, 'sizes' => ['S', 'M', 'L'], 'featured' => false, 'image' => self::IMG_ACTIVEWEAR],

        // Islamic / modest wear
        ['category' => 'Islamic / modest wear', 'name' => 'Embellished Abaya — Black & Gold', 'price' => 8999, 'sizes' => ['S', 'M', 'L', 'XL'], 'featured' => true, 'image' => self::IMG_ABAYA],
        ['category' => 'Islamic / modest wear', 'name' => 'Premium Chiffon Hijab', 'price' => 1499, 'sizes' => ['One Size'], 'featured' => false, 'image' => self::IMG_HIJAB],
        ['category' => 'Islamic / modest wear', 'name' => 'Open Abaya — Emerald Trim', 'price' => 8499, 'sizes' => ['S', 'M', 'L', 'XL'], 'featured' => false, 'image' => self::IMG_ABAYA],
        ['category' => 'Islamic / modest wear', 'name' => 'Jersey Hijab Set — 3 Pack', 'price' => 2499, 'sizes' => ['One Size'], 'featured' => false, 'image' => self::IMG_HIJAB],
        ['category' => 'Islamic / modest wear', 'name' => 'Modest Maxi Skirt — Pleated', 'price' => 4499, 'sizes' => ['S', 'M', 'L', 'XL'], 'featured' => false, 'image' => self::IMG_ABAYA],

        // Beauty products
        ['category' => 'Beauty products', 'name' => 'Radiance Skincare Set', 'price' => 5499, 'sizes' => ['One Size'], 'featured' => true, 'image' => self::IMG_SKINCARE],
        ['category' => 'Beauty products', 'name' => 'Matte Lipstick — Rich Gold Case', 'price' => 1899, 'sizes' => ['One Size'], 'featured' => false, 'image' => self::IMG_MAKEUP],
        ['category' => 'Beauty products', 'name' => 'Vitamin C Brightening Serum', 'price' => 2299, 'sizes' => ['30ml'], 'featured' => false, 'image' => self::IMG_SKINCARE],
        ['category' => 'Beauty products', 'name' => 'Shea Butter Body Cream', 'price' => 1599, 'sizes' => ['200ml'], 'featured' => false, 'image' => self::IMG_SKINCARE],
        ['category' => 'Beauty products', 'name' => 'Gold Shimmer Eyeshadow Palette', 'price' => 2999, 'sizes' => ['One Size'], 'featured' => true, 'image' => self::IMG_MAKEUP],
        ['category' => 'Beauty products', 'name' => 'Longwear Liquid Foundation', 'price' => 2199, 'sizes' => ['One Size'], 'featured' => false, 'image' => self::IMG_MAKEUP],

        // Accessories
        ['category' => 'Accessories', 'name' => 'Structured Tote Bag', 'price' => 5999, 'sizes' => ['One Size'], 'featured' => false, 'image' => self::IMG_BAG],
        ['category' => 'Accessories', 'name' => 'Layered Gold Necklace', 'price' => 2999, 'sizes' => ['One Size'], 'featured' => true, 'image' => self::IMG_JEWELLERY],
        ['category' => 'Accessories', 'name' => 'Quilted Crossbody Bag', 'price' => 4999, 'sizes' => ['One Size'], 'featured' => false, 'image' => self::IMG_BAG],
        ['category' => 'Accessories', 'name' => 'Statement Hoop Earrings', 'price' => 1799, 'sizes' => ['One Size'], 'featured' => false, 'image' => self::IMG_JEWELLERY],
        ['category' => 'Accessories', 'name' => 'Pearl Drop Necklace', 'price' => 2499, 'sizes' => ['One Size'], 'featured' => false, 'image' => self::IMG_JEWELLERY],

        // Men's wear
        ['category' => "Men's wear", 'name' => 'Tailored Kaftan', 'price' => 7499, 'sizes' => ['M', 'L', 'XL'], 'featured' => false, 'image' => self::IMG_MENSWEAR],
        ['category' => "Men's wear", 'name' => 'Slim-Fit Agbada Set', 'price' => 10999, 'sizes' => ['M', 'L', 'XL'], 'featured' => true, 'image' => self::IMG_MENSWEAR],
        ['category' => "Men's wear", 'name' => 'Premium Cotton Thobe', 'price' => 5999, 'sizes' => ['M', 'L', 'XL'], 'featured' => false, 'image' => self::IMG_MENSWEAR],

        // Baby's wear
        ['category' => "Baby's wear", 'name' => 'Organic Cotton Romper', 'price' => 1799, 'sizes' => ['0-3m', '3-6m', '6-12m'], 'featured' => false, 'image' => self::IMG_BABY],
        ['category' => "Baby's wear", 'name' => 'Knit Baby Cardigan', 'price' => 1999, 'sizes' => ['0-3m', '3-6m', '6-12m'], 'featured' => false, 'image' => self::IMG_BABY],
        ['category' => "Baby's wear", 'name' => 'Soft Sole Baby Booties', 'price' => 1199, 'sizes' => ['0-6m', '6-12m'], 'featured' => false, 'image' => self::IMG_BABY],

        // Shoes
        ['category' => 'Shoes', 'name' => 'Block Heel Sandals', 'price' => 5499, 'sizes' => ['UK 4', 'UK 5', 'UK 6', 'UK 7'], 'featured' => true, 'image' => self::IMG_SHOES],
        ['category' => 'Shoes', 'name' => 'Embellished Flat Mules', 'price' => 4299, 'sizes' => ['UK 4', 'UK 5', 'UK 6', 'UK 7'], 'featured' => false, 'image' => self::IMG_SHOES],
        ['category' => 'Shoes', 'name' => 'Statement Ankle Boots', 'price' => 7999, 'sizes' => ['UK 4', 'UK 5', 'UK 6', 'UK 7'], 'featured' => false, 'image' => self::IMG_SHOES],
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
                'path' => $def['image'].'?w=800&h=1000&fit=crop&auto=format&q=80',
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
