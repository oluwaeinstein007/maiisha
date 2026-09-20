<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductImageResolutionTest extends TestCase
{
    use RefreshDatabase;

    public function test_image_for_returns_the_photo_matching_the_requested_colour(): void
    {
        $product = Product::factory()->for(Category::factory())->create();
        $black = $product->images()->create(['path' => 'black.jpg', 'colour' => 'Black', 'sort_order' => 0]);
        $gold = $product->images()->create(['path' => 'gold.jpg', 'colour' => 'Gold', 'sort_order' => 1]);

        $product->load('images');

        $this->assertTrue($product->imageFor('Gold')->is($gold));
        $this->assertTrue($product->imageFor('Black')->is($black));
    }

    public function test_image_for_matches_colour_case_insensitively(): void
    {
        $product = Product::factory()->for(Category::factory())->create();
        $gold = $product->images()->create(['path' => 'gold.jpg', 'colour' => 'Gold', 'sort_order' => 0]);

        $product->load('images');

        $this->assertTrue($product->imageFor('gold')->is($gold));
        $this->assertTrue($product->imageFor('GOLD')->is($gold));
    }

    public function test_image_for_falls_back_to_the_first_photo_when_no_colour_matches(): void
    {
        $product = Product::factory()->for(Category::factory())->create();
        $first = $product->images()->create(['path' => 'first.jpg', 'colour' => null, 'sort_order' => 0]);
        $product->images()->create(['path' => 'second.jpg', 'colour' => null, 'sort_order' => 1]);

        $product->load('images');

        // Requested colour doesn't exist on any photo, and asking for no colour at all
        // both land on the same "first photo" fallback.
        $this->assertTrue($product->imageFor('Emerald')->is($first));
        $this->assertTrue($product->imageFor(null)->is($first));
    }

    public function test_image_for_returns_null_when_the_product_has_no_photos(): void
    {
        $product = Product::factory()->for(Category::factory())->create();
        $product->load('images');

        $this->assertNull($product->imageFor('Black'));
        $this->assertNull($product->imageFor(null));
    }
}
