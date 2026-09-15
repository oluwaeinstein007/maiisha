<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_lists_active_products_with_their_category_and_variants(): void
    {
        $category = Category::factory()->create(['name' => 'Shoes', 'slug' => 'shoes']);
        $product = Product::factory()->for($category)->create(['name' => 'Block Heels']);
        $product->variants()->create(['sku' => 'SKU-1', 'size' => 'UK 5', 'stock_quantity' => 4]);

        Product::factory()->create(['is_active' => false]);

        $response = $this->getJson('/api/products');

        $response->assertOk();
        $names = collect($response->json('data'))->pluck('name');
        $this->assertContains('Block Heels', $names);
        $this->assertCount(1, $names);
    }

    public function test_it_filters_products_by_category_slug(): void
    {
        $shoes = Category::factory()->create(['slug' => 'shoes']);
        $bags = Category::factory()->create(['slug' => 'bags']);
        Product::factory()->for($shoes)->create(['name' => 'Heels']);
        Product::factory()->for($bags)->create(['name' => 'Tote Bag']);

        $response = $this->getJson('/api/products?category=shoes');

        $response->assertOk();
        $names = collect($response->json('data'))->pluck('name');
        $this->assertEquals(['Heels'], $names->all());
    }

    public function test_it_shows_a_single_product_by_slug(): void
    {
        $product = Product::factory()->create(['slug' => 'gold-necklace']);

        $this->getJson('/api/products/gold-necklace')
            ->assertOk()
            ->assertJsonPath('data.slug', 'gold-necklace');
    }

    public function test_categories_endpoint_returns_nested_children(): void
    {
        $parent = Category::factory()->create(['name' => 'Fashion']);
        Category::factory()->create(['name' => 'Dresses', 'parent_id' => $parent->id]);

        $response = $this->getJson('/api/categories');

        $response->assertOk();
        $fashion = collect($response->json('data'))->firstWhere('name', 'Fashion');
        $this->assertNotNull($fashion);
        $this->assertEquals('Dresses', $fashion['children'][0]['name']);
    }
}
