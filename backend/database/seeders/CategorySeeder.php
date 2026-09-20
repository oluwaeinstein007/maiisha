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
        // Keyed by slug (the unique column) so re-running `db:seed` against an
        // already-seeded database updates in place instead of throwing a
        // UniqueConstraintViolationException.
        $sortOrder = 0;

        foreach (self::CATEGORIES as $name => $children) {
            $parent = Category::updateOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name, 'sort_order' => $sortOrder++],
            );

            foreach ($children as $i => $childName) {
                Category::updateOrCreate(
                    ['slug' => Str::slug($name.'-'.$childName)],
                    ['parent_id' => $parent->id, 'name' => $childName, 'sort_order' => $i],
                );
            }
        }
    }
}
