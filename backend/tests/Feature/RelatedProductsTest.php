<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RelatedProductsTest extends TestCase
{
    use RefreshDatabase;

    public function test_related_prefers_same_category_and_excludes_self_and_inactive(): void
    {
        $dresses = Category::factory()->create();
        $tops = Category::factory()->create();

        $product = Product::factory()->for($dresses)->create(['slug' => 'main']);
        $sibling = Product::factory()->for($dresses)->create(['name' => 'Sibling']);
        Product::factory()->for($dresses)->create(['is_active' => false]);
        Product::factory()->for($tops)->create(['name' => 'Elsewhere']);

        $response = $this->getJson('/api/products/main/related');

        $response->assertOk();
        $names = collect($response->json('data'))->pluck('name');
        $this->assertSame('Sibling', $names->first());
        $this->assertNotContains($product->name, $names);
        $this->assertCount(1, $names);
    }

    public function test_related_404s_for_unknown_product(): void
    {
        $this->getJson('/api/products/nope/related')->assertNotFound();
    }
}
