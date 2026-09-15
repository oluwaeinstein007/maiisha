<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    /** Phase 1 launch categories, per PRD §3. */
    private const CATEGORIES = [
        'Hair extensions & hair products' => ['Clip-ins', 'Wigs', 'Hair care'],
        "Women's fashion" => ['Dresses', 'Tops', 'Outerwear'],
        'Activewear' => [],
        'Islamic / modest wear' => ['Abayas', 'Hijabs'],
        'Beauty products' => ['Skincare', 'Makeup'],
        'Accessories' => ['Bags', 'Jewellery'],
        "Men's wear" => [],
        "Baby's wear" => [],
        'Shoes' => [],
    ];

    public function run(): void
    {
        $sortOrder = 0;

        foreach (self::CATEGORIES as $name => $children) {
            $parent = Category::create([
                'name' => $name,
                'slug' => Str::slug($name),
                'sort_order' => $sortOrder++,
            ]);

            foreach ($children as $i => $childName) {
                Category::create([
                    'parent_id' => $parent->id,
                    'name' => $childName,
                    'slug' => Str::slug($name.'-'.$childName),
                    'sort_order' => $i,
                ]);
            }
        }
    }
}
