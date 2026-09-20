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

    /**
     * Catalogue definitions. Each product has an ordered list of "colourways" —
     * even single-colour (or colourless) products get one — and each colourway
     * carries its own sizes and photo(s). There's no per-colour photography
     * available for this demo catalogue, so a second colourway reuses the same
     * base photo with an imgix `sat` (saturation) tweak via {@see self::photo()}
     * — a distinct, valid image rather than a broken/duplicate one — so picking
     * a colour on the storefront visibly swaps the photo (FR-3). Every
     * colourway also gets two crops (front + alternate) so the gallery/thumbnail
     * strip always has more than one image to demonstrate multi-image products.
     */
    private const PRODUCTS = [
        // Hair extensions & hair products
        ['category' => 'Hair extensions & hair products', 'name' => 'Silky Clip-In Extensions', 'price' => 4999, 'featured' => true, 'image' => self::IMG_HAIRWIG, 'colours' => [
            'Natural Black' => ['sizes' => ['16"', '20"', '24"']],
            'Chocolate Brown' => ['sizes' => ['16"', '20"', '24"'], 'tint' => true],
        ]],
        ['category' => 'Hair extensions & hair products', 'name' => 'Lace Front Wig — Bone Straight', 'price' => 12999, 'featured' => false, 'image' => self::IMG_HAIRWIG, 'colours' => [
            'Natural Black' => ['sizes' => ['16"', '20"']],
        ]],
        ['category' => 'Hair extensions & hair products', 'name' => 'Kinky Curly Clip-In Set', 'price' => 5499, 'featured' => false, 'image' => self::IMG_HAIRWIG, 'colours' => [
            'Natural Black' => ['sizes' => ['16"', '20"', '24"']],
            'Honey Blonde' => ['sizes' => ['16"', '20"', '24"'], 'tint' => true],
        ]],
        ['category' => 'Hair extensions & hair products', 'name' => 'Full Lace Wig — Deep Wave', 'price' => 14999, 'featured' => true, 'image' => self::IMG_HAIRWIG, 'colours' => [
            'Natural Black' => ['sizes' => ['18"', '22"']],
        ]],
        ['category' => 'Hair extensions & hair products', 'name' => 'Argan Oil Hair Treatment', 'price' => 1299, 'featured' => false, 'image' => self::IMG_HAIRCARE, 'colours' => [
            null => ['sizes' => ['100ml']],
        ]],
        ['category' => 'Hair extensions & hair products', 'name' => 'Edge Control & Wig Cap Set', 'price' => 999, 'featured' => false, 'image' => self::IMG_HAIRWIG, 'colours' => [
            null => ['sizes' => ['One Size']],
        ]],

        // Women's fashion
        ['category' => "Women's fashion", 'name' => 'Gold-Trim Wrap Dress', 'price' => 6499, 'featured' => true, 'image' => self::IMG_DRESS, 'colours' => [
            'Black' => ['sizes' => ['S', 'M', 'L', 'XL']],
            'Emerald' => ['sizes' => ['S', 'M', 'L', 'XL'], 'tint' => true],
        ]],
        ['category' => "Women's fashion", 'name' => 'Satin Blouse — Noir', 'price' => 3499, 'featured' => false, 'image' => self::IMG_BLOUSE, 'colours' => [
            'Black' => ['sizes' => ['S', 'M', 'L']],
        ]],
        ['category' => "Women's fashion", 'name' => 'Pleated Maxi Dress', 'price' => 5999, 'featured' => false, 'image' => self::IMG_DRESS, 'colours' => [
            'Emerald' => ['sizes' => ['S', 'M', 'L', 'XL']],
            'Black' => ['sizes' => ['S', 'M', 'L', 'XL'], 'tint' => true],
        ]],
        ['category' => "Women's fashion", 'name' => 'Puff-Sleeve Blouse — Ivory', 'price' => 3299, 'featured' => false, 'image' => self::IMG_BLOUSE, 'colours' => [
            'Ivory' => ['sizes' => ['S', 'M', 'L']],
        ]],
        ['category' => "Women's fashion", 'name' => 'Faux-Leather Trench Coat', 'price' => 8999, 'featured' => true, 'image' => self::IMG_OUTERWEAR, 'colours' => [
            'Black' => ['sizes' => ['S', 'M', 'L', 'XL']],
            'Charcoal' => ['sizes' => ['S', 'M', 'L', 'XL'], 'tint' => true],
        ]],
        ['category' => "Women's fashion", 'name' => 'Tailored Wool Blazer', 'price' => 7499, 'featured' => false, 'image' => self::IMG_OUTERWEAR, 'colours' => [
            'Charcoal' => ['sizes' => ['S', 'M', 'L']],
        ]],

        // Activewear
        ['category' => 'Activewear', 'name' => 'Seamless Gym Set', 'price' => 4299, 'featured' => true, 'image' => self::IMG_ACTIVEWEAR, 'colours' => [
            'Black' => ['sizes' => ['S', 'M', 'L']],
            'Grey' => ['sizes' => ['S', 'M', 'L'], 'tint' => true],
        ]],
        ['category' => 'Activewear', 'name' => 'High-Waist Leggings — Charcoal', 'price' => 2799, 'featured' => false, 'image' => self::IMG_ACTIVEWEAR, 'colours' => [
            'Charcoal' => ['sizes' => ['S', 'M', 'L', 'XL']],
        ]],
        ['category' => 'Activewear', 'name' => 'Cropped Sports Hoodie', 'price' => 3199, 'featured' => false, 'image' => self::IMG_ACTIVEWEAR, 'colours' => [
            'Grey' => ['sizes' => ['S', 'M', 'L']],
        ]],

        // Islamic / modest wear
        ['category' => 'Islamic / modest wear', 'name' => 'Embellished Abaya — Black & Gold', 'price' => 8999, 'featured' => true, 'image' => self::IMG_ABAYA, 'colours' => [
            'Black' => ['sizes' => ['S', 'M', 'L', 'XL']],
            'Emerald' => ['sizes' => ['S', 'M', 'L', 'XL'], 'tint' => true],
        ]],
        ['category' => 'Islamic / modest wear', 'name' => 'Premium Chiffon Hijab', 'price' => 1499, 'featured' => false, 'image' => self::IMG_HIJAB, 'colours' => [
            'Black' => ['sizes' => ['One Size']],
            'Navy' => ['sizes' => ['One Size'], 'tint' => true],
        ]],
        ['category' => 'Islamic / modest wear', 'name' => 'Open Abaya — Emerald Trim', 'price' => 8499, 'featured' => false, 'image' => self::IMG_ABAYA, 'colours' => [
            'Emerald' => ['sizes' => ['S', 'M', 'L', 'XL']],
        ]],
        ['category' => 'Islamic / modest wear', 'name' => 'Jersey Hijab Set — 3 Pack', 'price' => 2499, 'featured' => false, 'image' => self::IMG_HIJAB, 'colours' => [
            null => ['sizes' => ['One Size']],
        ]],
        ['category' => 'Islamic / modest wear', 'name' => 'Modest Maxi Skirt — Pleated', 'price' => 4499, 'featured' => false, 'image' => self::IMG_ABAYA, 'colours' => [
            'Navy' => ['sizes' => ['S', 'M', 'L', 'XL']],
        ]],

        // Beauty products
        ['category' => 'Beauty products', 'name' => 'Radiance Skincare Set', 'price' => 5499, 'featured' => true, 'image' => self::IMG_SKINCARE, 'colours' => [
            null => ['sizes' => ['One Size']],
        ]],
        ['category' => 'Beauty products', 'name' => 'Matte Lipstick — Rich Gold Case', 'price' => 1899, 'featured' => false, 'image' => self::IMG_MAKEUP, 'colours' => [
            'Ruby Red' => ['sizes' => ['One Size']],
            'Nude Rose' => ['sizes' => ['One Size'], 'tint' => true],
        ]],
        ['category' => 'Beauty products', 'name' => 'Vitamin C Brightening Serum', 'price' => 2299, 'featured' => false, 'image' => self::IMG_SKINCARE, 'colours' => [
            null => ['sizes' => ['30ml']],
        ]],
        ['category' => 'Beauty products', 'name' => 'Shea Butter Body Cream', 'price' => 1599, 'featured' => false, 'image' => self::IMG_SKINCARE, 'colours' => [
            null => ['sizes' => ['200ml']],
        ]],
        ['category' => 'Beauty products', 'name' => 'Gold Shimmer Eyeshadow Palette', 'price' => 2999, 'featured' => true, 'image' => self::IMG_MAKEUP, 'colours' => [
            null => ['sizes' => ['One Size']],
        ]],
        ['category' => 'Beauty products', 'name' => 'Longwear Liquid Foundation', 'price' => 2199, 'featured' => false, 'image' => self::IMG_MAKEUP, 'colours' => [
            'Fair' => ['sizes' => ['One Size']],
            'Medium' => ['sizes' => ['One Size'], 'tint' => true],
            'Deep' => ['sizes' => ['One Size'], 'tint' => true],
        ]],

        // Accessories
        ['category' => 'Accessories', 'name' => 'Structured Tote Bag', 'price' => 5999, 'featured' => false, 'image' => self::IMG_BAG, 'colours' => [
            'Black' => ['sizes' => ['One Size']],
            'Tan' => ['sizes' => ['One Size'], 'tint' => true],
        ]],
        ['category' => 'Accessories', 'name' => 'Layered Gold Necklace', 'price' => 2999, 'featured' => true, 'image' => self::IMG_JEWELLERY, 'colours' => [
            'Gold' => ['sizes' => ['One Size']],
        ]],
        ['category' => 'Accessories', 'name' => 'Quilted Crossbody Bag', 'price' => 4999, 'featured' => false, 'image' => self::IMG_BAG, 'colours' => [
            'Black' => ['sizes' => ['One Size']],
        ]],
        ['category' => 'Accessories', 'name' => 'Statement Hoop Earrings', 'price' => 1799, 'featured' => false, 'image' => self::IMG_JEWELLERY, 'colours' => [
            'Gold' => ['sizes' => ['One Size']],
            'Silver' => ['sizes' => ['One Size'], 'tint' => true],
        ]],
        ['category' => 'Accessories', 'name' => 'Pearl Drop Necklace', 'price' => 2499, 'featured' => false, 'image' => self::IMG_JEWELLERY, 'colours' => [
            'Gold' => ['sizes' => ['One Size']],
        ]],

        // Men's wear
        ['category' => "Men's wear", 'name' => 'Tailored Kaftan', 'price' => 7499, 'featured' => false, 'image' => self::IMG_MENSWEAR, 'colours' => [
            'Navy' => ['sizes' => ['M', 'L', 'XL']],
            'Black' => ['sizes' => ['M', 'L', 'XL'], 'tint' => true],
        ]],
        ['category' => "Men's wear", 'name' => 'Slim-Fit Agbada Set', 'price' => 10999, 'featured' => true, 'image' => self::IMG_MENSWEAR, 'colours' => [
            'Black' => ['sizes' => ['M', 'L', 'XL']],
        ]],
        ['category' => "Men's wear", 'name' => 'Premium Cotton Thobe', 'price' => 5999, 'featured' => false, 'image' => self::IMG_MENSWEAR, 'colours' => [
            'White' => ['sizes' => ['M', 'L', 'XL']],
            'Black' => ['sizes' => ['M', 'L', 'XL'], 'tint' => true],
        ]],

        // Baby's wear
        ['category' => "Baby's wear", 'name' => 'Organic Cotton Romper', 'price' => 1799, 'featured' => false, 'image' => self::IMG_BABY, 'colours' => [
            null => ['sizes' => ['0-3m', '3-6m', '6-12m']],
        ]],
        ['category' => "Baby's wear", 'name' => 'Knit Baby Cardigan', 'price' => 1999, 'featured' => false, 'image' => self::IMG_BABY, 'colours' => [
            null => ['sizes' => ['0-3m', '3-6m', '6-12m']],
        ]],
        ['category' => "Baby's wear", 'name' => 'Soft Sole Baby Booties', 'price' => 1199, 'featured' => false, 'image' => self::IMG_BABY, 'colours' => [
            null => ['sizes' => ['0-6m', '6-12m']],
        ]],

        // Shoes
        ['category' => 'Shoes', 'name' => 'Block Heel Sandals', 'price' => 5499, 'featured' => true, 'image' => self::IMG_SHOES, 'colours' => [
            'Black' => ['sizes' => ['UK 4', 'UK 5', 'UK 6', 'UK 7']],
            'Nude' => ['sizes' => ['UK 4', 'UK 5', 'UK 6', 'UK 7'], 'tint' => true],
        ]],
        ['category' => 'Shoes', 'name' => 'Embellished Flat Mules', 'price' => 4299, 'featured' => false, 'image' => self::IMG_SHOES, 'colours' => [
            'Gold' => ['sizes' => ['UK 4', 'UK 5', 'UK 6', 'UK 7']],
        ]],
        ['category' => 'Shoes', 'name' => 'Statement Ankle Boots', 'price' => 7999, 'featured' => false, 'image' => self::IMG_SHOES, 'colours' => [
            'Black' => ['sizes' => ['UK 4', 'UK 5', 'UK 6', 'UK 7']],
            'Brown' => ['sizes' => ['UK 4', 'UK 5', 'UK 6', 'UK 7'], 'tint' => true],
        ]],
    ];

    /**
     * Hex tint for each colour name that appears as a second (or third)
     * colourway in PRODUCTS. Unsplash's image API supports a `mono=<hex>`
     * duotone param that's dramatic enough to read as a different photo at
     * thumbnail size — plain saturation/blend tweaks tested nearly invisible
     * on their CDN. Keyed lowercase; a colour with no entry here just keeps
     * the base photo untinted.
     */
    private const COLOUR_HEX = [
        'chocolate brown' => '4B2E1E',
        'honey blonde' => 'C68642',
        'emerald' => '046307',
        'black' => '111111',
        'charcoal' => '36454F',
        'grey' => '808080',
        'navy' => '1B1F3B',
        'nude rose' => 'E8B4A0',
        'medium' => 'A9744F',
        'deep' => '5C3A21',
        'tan' => 'C19A6B',
        'silver' => 'C0C0C0',
        'nude' => 'E3BC9A',
        'brown' => '6F4E37',
    ];

    /**
     * Builds a crop of the product's base photo. `alt` picks a different crop
     * gravity for the second gallery photo, and `colour` (only passed for a
     * non-primary colourway — see PRODUCTS' `tint` flag) applies a duotone
     * tint so that colourway visibly differs from the first without needing
     * separate photography.
     */
    private function photo(string $base, bool $alt = false, ?string $colour = null): string
    {
        $url = $base.'?w=800&h=1000&fit=crop&auto=format&q=80';
        $url .= $alt ? '&crop=top' : '&crop=faces,entropy';

        $hex = $colour !== null ? self::COLOUR_HEX[strtolower($colour)] ?? null : null;

        if ($hex !== null) {
            $url .= '&mono='.$hex;
        }

        return $url;
    }

    public function run(): void
    {
        foreach (self::PRODUCTS as $i => $def) {
            $category = Category::where('name', $def['category'])->whereNull('parent_id')->first();

            // Keyed by slug (the unique column) so re-running `db:seed` updates the
            // product in place. Images are only (re-)created the first time —
            // there's no unique key to upsert on, so re-running would otherwise
            // pile up duplicates. Variants are upserted on SKU below, so re-running
            // also backfills fields (e.g. colour) on variants seeded previously.
            $product = Product::updateOrCreate(
                ['slug' => Str::slug($def['name'])],
                [
                    'category_id' => $category->id,
                    'name' => $def['name'],
                    'description' => "Premium {$def['name']} from the MAI_ISHA collection — polished, on-brand black & gold quality.",
                    'price_pence' => $def['price'],
                    'is_active' => true,
                    'is_featured' => $def['featured'],
                ],
            );

            if ($product->wasRecentlyCreated) {
                $sortOrder = 0;

                foreach ($def['colours'] as $colour => $colourDef) {
                    // PHP array literals coerce a `null` key to `""`, so a
                    // colourless colourway (`null => [...]` in PRODUCTS) arrives
                    // here as `""` — convert it back so images/variants store a
                    // real NULL instead of an empty string (Product::imageFor()
                    // and the storefront colour picker both key off NULL).
                    $colour = $colour === '' ? null : $colour;
                    $tinted = $colourDef['tint'] ?? false;
                    $tintColour = $tinted ? $colour : null;
                    $label = $colour ?? $def['name'];

                    $product->images()->create([
                        'path' => $this->photo($def['image'], alt: false, colour: $tintColour),
                        'alt_text' => $label,
                        'colour' => $colour,
                        'sort_order' => $sortOrder++,
                    ]);
                    $product->images()->create([
                        'path' => $this->photo($def['image'], alt: true, colour: $tintColour),
                        'alt_text' => $label.' — alternate angle',
                        'colour' => $colour,
                        'sort_order' => $sortOrder++,
                    ]);
                }
            }

            $variantIndex = 0;

            foreach ($def['colours'] as $colour => $colourDef) {
                $colour = $colour === '' ? null : $colour;

                foreach ($colourDef['sizes'] as $size) {
                    $variantIndex++;

                    $product->variants()->updateOrCreate(
                        ['sku' => 'MAI-'.str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT).'-'.str_pad((string) $variantIndex, 2, '0', STR_PAD_LEFT)],
                        [
                            'size' => $size,
                            'colour' => $colour,
                            'stock_quantity' => $variantIndex === 1 ? 3 : 20,
                            'low_stock_threshold' => 5,
                        ],
                    );
                }
            }
        }
    }
}
