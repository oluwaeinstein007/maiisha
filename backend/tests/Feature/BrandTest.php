<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BrandTest extends TestCase
{
    use RefreshDatabase;

    /** @param  list<array{0: ?string, 1: ?string}>  $variants  [size, colour] */
    private function product(string $name, ?Brand $brand = null, ?Category $category = null, array $variants = [], bool $active = true): Product
    {
        $product = Product::factory()
            ->for($category ?? Category::factory()->create())
            ->create(['name' => $name, 'brand_id' => $brand?->id, 'is_active' => $active]);

        foreach ($variants as $i => [$size, $colour]) {
            $product->variants()->create(['sku' => strtoupper(substr($name, 0, 3)).$i.uniqid(), 'size' => $size, 'colour' => $colour, 'stock_quantity' => 5]);
        }

        return $product;
    }

    /** @return list<string> */
    private function names(string $query): array
    {
        return collect($this->getJson("/api/products?{$query}")->assertOk()->json('data'))->pluck('name')->all();
    }

    public function test_the_brands_list_shows_only_live_brands_that_have_something_to_buy(): void
    {
        $second = Brand::factory()->create(['name' => 'Zeta', 'sort_order' => 2]);
        $first = Brand::factory()->create(['name' => 'Alpha', 'sort_order' => 1]);
        $empty = Brand::factory()->create(['name' => 'No Products']);
        $off = Brand::factory()->create(['name' => 'Switched Off', 'is_active' => false]);
        $onlyHidden = Brand::factory()->create(['name' => 'Only Inactive Stock']);

        $this->product('A1', $first);
        $this->product('A2', $first);
        $this->product('Z1', $second);
        $this->product('Hidden', $off);
        $this->product('Inactive product', $onlyHidden, active: false);

        $response = $this->getJson('/api/brands')->assertOk();

        $this->assertSame(['Alpha', 'Zeta'], collect($response->json('data'))->pluck('name')->all(), 'ordered by sort order, then name');
        $this->assertSame([2, 1], collect($response->json('data'))->pluck('products_count')->all());
        $this->assertNotContains($empty->name, collect($response->json('data'))->pluck('name')->all());
    }

    public function test_a_brand_is_found_by_slug_and_a_switched_off_one_is_a_404(): void
    {
        $live = Brand::factory()->create(['name' => 'Noor', 'slug' => 'noor']);
        $off = Brand::factory()->create(['slug' => 'gone', 'is_active' => false]);
        $this->product('P', $live);

        $this->getJson('/api/brands/noor')->assertOk()->assertJsonPath('data.name', 'Noor')->assertJsonPath('data.products_count', 1);
        $this->getJson('/api/brands/gone')->assertNotFound();
        $this->getJson('/api/brands/nope')->assertNotFound();
        $this->assertNotNull($off);
    }

    public function test_products_carry_their_live_brand_but_not_a_switched_off_one(): void
    {
        $live = Brand::factory()->create(['name' => 'Live Brand', 'slug' => 'live-brand']);
        $off = Brand::factory()->create(['name' => 'Off Brand', 'is_active' => false]);
        $this->product('Branded', $live);
        $this->product('Formerly branded', $off);
        $this->product('Unbranded');

        $products = collect($this->getJson('/api/products')->assertOk()->json('data'))->keyBy('name');

        $this->assertSame(['id' => $live->id, 'name' => 'Live Brand', 'slug' => 'live-brand'], $products['Branded']['brand']);
        $this->assertNull($products['Formerly branded']['brand'], 'a switched-off brand is not shown to shoppers');
        $this->assertSame($off->id, $products['Formerly branded']['brand_id']);
        $this->assertNull($products['Unbranded']['brand']);
    }

    public function test_products_can_be_filtered_by_one_or_several_brand_slugs(): void
    {
        $a = Brand::factory()->create(['slug' => 'a']);
        $b = Brand::factory()->create(['slug' => 'b']);
        $off = Brand::factory()->create(['slug' => 'off', 'is_active' => false]);
        $this->product('From A', $a);
        $this->product('From B', $b);
        $this->product('From Off', $off);
        $this->product('Unbranded');

        $this->assertSame(['From A'], $this->names('brand=a'));
        $this->assertEqualsCanonicalizing(['From A', 'From B'], $this->names('brand=A,b'));
        $this->assertSame([], $this->names('brand=off'), 'a switched-off brand has no listing');
        $this->assertSame([], $this->names('brand=unknown'));
    }

    public function test_choosing_a_brand_narrows_the_filter_options_but_the_brand_list_stays_whole(): void
    {
        $a = Brand::factory()->create(['name' => 'Alpha', 'slug' => 'alpha', 'sort_order' => 1]);
        $b = Brand::factory()->create(['name' => 'Beta', 'slug' => 'beta', 'sort_order' => 2]);
        $this->product('From A', $a, variants: [['S', 'Gold']]);
        $this->product('From B', $b, variants: [['XL', 'Black']]);

        $response = $this->getJson('/api/products/filters?brand=alpha')->assertOk();

        $this->assertSame(['S'], $response->json('sizes'));
        $this->assertSame(['Gold'], $response->json('colours'));
        // …but the shopper can still switch brand, so the facet ignores the brand filter itself.
        $this->assertSame(
            [['slug' => 'alpha', 'name' => 'Alpha', 'count' => 1], ['slug' => 'beta', 'name' => 'Beta', 'count' => 1]],
            $response->json('brands'),
        );
    }

    public function test_brand_counts_follow_the_category_and_search_being_browsed(): void
    {
        $shoes = Category::factory()->create(['slug' => 'shoes']);
        $bags = Category::factory()->create(['slug' => 'bags']);
        $a = Brand::factory()->create(['name' => 'Alpha', 'slug' => 'alpha']);
        $b = Brand::factory()->create(['name' => 'Beta', 'slug' => 'beta']);
        $this->product('Red Boot', $a, $shoes);
        $this->product('Blue Boot', $a, $shoes);
        $this->product('Red Bag', $b, $bags);

        $inShoes = $this->getJson('/api/products/filters?category=shoes')->json('brands');
        $this->assertSame([['slug' => 'alpha', 'name' => 'Alpha', 'count' => 2]], $inShoes);

        $searched = $this->getJson('/api/products/filters?search=red')->json('brands');
        $this->assertEqualsCanonicalizing(
            [['slug' => 'alpha', 'name' => 'Alpha', 'count' => 1], ['slug' => 'beta', 'name' => 'Beta', 'count' => 1]],
            $searched,
        );
    }

    public function test_a_switched_off_brand_is_not_offered_as_a_filter(): void
    {
        $off = Brand::factory()->create(['is_active' => false]);
        $this->product('P', $off);

        $this->assertSame([], $this->getJson('/api/products/filters')->json('brands'));
    }
}
