<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProductFilterTest extends TestCase
{
    use RefreshDatabase;

    /** @param  list<array{0: ?string, 1: ?string, 2?: int, 3?: bool}>  $variants  [size, colour, stock, active] */
    private function product(string $name, int $pricePence, array $variants = [], ?Category $category = null): Product
    {
        $product = Product::factory()
            ->for($category ?? Category::factory()->create())
            ->create(['name' => $name, 'price_pence' => $pricePence]);

        foreach ($variants as $i => $variant) {
            $product->variants()->create([
                'sku' => strtoupper(substr($name, 0, 3)).'-'.$i.'-'.uniqid(),
                'size' => $variant[0],
                'colour' => $variant[1],
                'stock_quantity' => $variant[2] ?? 5,
                'is_active' => $variant[3] ?? true,
            ]);
        }

        return $product;
    }

    /** @return list<string> */
    private function names(string $query): array
    {
        return collect($this->getJson("/api/products?{$query}")->assertOk()->json('data'))->pluck('name')->all();
    }

    public function test_size_filter_accepts_several_values_case_insensitively(): void
    {
        $this->product('Small', 1000, [['S', null]]);
        $this->product('Medium', 1000, [['M', null]]);
        $this->product('Large', 1000, [['L', null]]);

        $this->assertEqualsCanonicalizing(['Small', 'Medium'], $this->names('size=s,M'));
        $this->assertSame(['Large'], $this->names('size[]=l'));
    }

    public function test_size_and_colour_must_match_on_the_same_variant(): void
    {
        // Has an S (black) and a Gold (M) — but no gold S.
        $this->product('Split', 1000, [['S', 'Black'], ['M', 'Gold']]);
        $this->product('Match', 1000, [['S', 'Gold']]);

        $this->assertSame(['Match'], $this->names('size=S&colour=Gold'));
    }

    public function test_in_stock_only_hides_products_with_nothing_available(): void
    {
        $this->product('Available', 1000, [['M', null, 3]]);
        $this->product('Sold out', 1000, [['M', null, 0]]);
        $this->product('Only inactive stock', 1000, [['M', null, 9, false]]);

        $this->assertSame(['Available'], $this->names('in_stock=1'));
        $this->assertCount(3, $this->names(''), 'without the filter, sold-out items stay browsable (FR-23)');
    }

    public function test_price_filters_and_sorting_use_the_sale_price(): void
    {
        $dear = $this->product('Dear', 6000);   // £60, but 50% off → £30 on sale
        $mid = $this->product('Mid', 4000);     // £40
        $sale = Sale::factory()->create(['value' => 50, 'applies_to' => 'selected']);
        $sale->products()->sync([$dear->id]);

        // Under £35: only the on-sale £60 item qualifies.
        $this->assertSame(['Dear'], $this->names('max_price=3500'));
        // From £35 up: the £40 item, not the £60 one (it's £30 now).
        $this->assertSame(['Mid'], $this->names('min_price=3500'));

        $this->assertSame(['Dear', 'Mid'], $this->names('sort=price_asc'));
        $this->assertSame(['Mid', 'Dear'], $this->names('sort=price_desc'));
    }

    public function test_price_filters_work_without_any_sale(): void
    {
        $this->product('Cheap', 1000);
        $this->product('Pricey', 9000);

        $this->assertSame(['Cheap'], $this->names('max_price=2000'));
        $this->assertSame(['Pricey'], $this->names('min_price=2000'));
        $this->assertSame(['Cheap', 'Pricey'], $this->names('sort=price_asc'));
    }

    public function test_on_sale_returns_only_discounted_products_and_nothing_when_no_sale_runs(): void
    {
        $a = $this->product('A', 5000);
        $this->product('B', 5000);

        $this->assertSame([], $this->names('on_sale=1'));

        $sale = Sale::factory()->create(['applies_to' => 'selected']);
        $sale->products()->sync([$a->id]);

        $this->assertSame(['A'], $this->names('on_sale=1'));
    }

    public function test_discount_sort_puts_the_biggest_saving_first(): void
    {
        $small = $this->product('Small saving', 5000);
        $big = $this->product('Big saving', 20000);
        $none = $this->product('No saving', 9000);

        $sale = Sale::factory()->create(['value' => 10, 'applies_to' => 'selected']);
        $sale->products()->sync([$small->id, $big->id]);

        $this->assertSame(['Big saving', 'Small saving', 'No saving'], $this->names('sort=discount'));
    }

    public function test_multiple_live_sales_combine_in_sql_the_way_they_do_in_php(): void
    {
        $product = $this->product('Item', 10000);
        Sale::factory()->create(['value' => 10]);
        Sale::factory()->create(['type' => 'fixed', 'value' => 2500]);

        // Best of 10% (£90) and £25 off (£75) is £75 — and both paths must agree.
        $this->assertSame(['Item'], $this->names('max_price=7500'));
        $this->assertSame([], $this->names('max_price=7499'));
        $this->assertSame(7500, $this->getJson('/api/products')->json('data.0.min_price_pence'));
    }

    public function test_a_parent_category_lists_products_from_its_subcategories(): void
    {
        $women = Category::factory()->create(['slug' => 'womens']);
        $dresses = Category::factory()->create(['slug' => 'dresses', 'parent_id' => $women->id]);
        $shoes = Category::factory()->create(['slug' => 'shoes']);

        $this->product('Top', 1000, [], $women);
        $this->product('Maxi', 1000, [], $dresses);
        $this->product('Boot', 1000, [], $shoes);

        $this->assertEqualsCanonicalizing(['Top', 'Maxi'], $this->names('category=womens'));
        $this->assertSame(['Maxi'], $this->names('category=dresses'));
        $this->assertSame([], $this->names('category=nope'));
    }

    public function test_search_is_case_insensitive_and_treats_wildcards_literally(): void
    {
        $this->product('Pleated Maxi Dress', 1000);
        $this->product('100% Cotton Tee', 1000);
        $this->product('Silk Scarf', 1000);

        $this->assertSame(['Pleated Maxi Dress'], $this->names('search=dress'));
        $this->assertSame(['Pleated Maxi Dress'], $this->names('search=MAXI'));
        $this->assertSame(['100% Cotton Tee'], $this->names('search='.urlencode('100%')));
        // A lone % is a literal character, not "match everything": only the product that contains one comes back.
        $this->assertSame(['100% Cotton Tee'], $this->names('search='.urlencode('%')));
    }

    public function test_search_sql_avoids_a_backslash_literal_that_pdo_pgsql_cannot_bind_around(): void
    {
        // SQLite tolerates ESCAPE '\' but PDO's pgsql driver reads the backslash as an escape,
        // loses the placeholders after it and throws "parameter was not defined" (a 500 in
        // production only). The tests run on SQLite, so guard the SQL itself.
        DB::enableQueryLog();

        $this->getJson('/api/products?search=dress')->assertOk();

        $sql = collect(DB::getQueryLog())->pluck('query')->implode("\n");
        $this->assertStringContainsString('LIKE ? ESCAPE', $sql);
        $this->assertStringNotContainsString('\\', $sql);
    }

    public function test_filters_endpoint_lists_sorted_deduplicated_options_and_the_price_range(): void
    {
        $this->product('One', 2000, [['XL', 'black'], ['S', 'Black'], ['M', 'Gold']]);
        $this->product('Two', 8000, [['UK 10', null], ['UK 5', null], ['One Size', 'Gold'], ['L', 'gold', 5, false]]);

        $response = $this->getJson('/api/products/filters')->assertOk();

        // Garment sizes in wearing order, then natural order for the rest — never "UK 10" before "UK 5".
        $this->assertSame(['S', 'M', 'XL', 'One Size', 'UK 5', 'UK 10'], $response->json('sizes'));
        // "black"/"Black" are one option; the inactive gold variant doesn't add an option either.
        $this->assertSame(['black', 'Gold'], $response->json('colours'));
        $response->assertJsonPath('price.min_pence', 2000)->assertJsonPath('price.max_pence', 8000);
    }

    public function test_filters_endpoint_reports_the_sale_price_range_and_on_sale_count(): void
    {
        $a = $this->product('A', 10000);
        $this->product('B', 4000);
        $sale = Sale::factory()->create(['value' => 50, 'applies_to' => 'selected']);
        $sale->products()->sync([$a->id]);

        $response = $this->getJson('/api/products/filters')->assertOk();

        $response->assertJsonPath('price.min_pence', 4000)
            ->assertJsonPath('price.max_pence', 5000)
            ->assertJsonPath('on_sale_count', 1);
    }

    public function test_filter_options_can_be_limited_to_products_on_sale(): void
    {
        $discounted = $this->product('Discounted', 5000, [['S', 'Gold']]);
        $this->product('Full price', 9000, [['XL', 'Black']]);
        $sale = Sale::factory()->create(['applies_to' => 'selected']);
        $sale->products()->sync([$discounted->id]);

        $response = $this->getJson('/api/products/filters?on_sale=1')->assertOk();

        $this->assertSame(['S'], $response->json('sizes'));
        $this->assertSame(['Gold'], $response->json('colours'));
        $response->assertJsonPath('price.max_pence', 4000);
    }

    public function test_filters_are_scoped_to_the_category_and_search_being_browsed(): void
    {
        $shoes = Category::factory()->create(['slug' => 'shoes']);
        $this->product('Boot', 1000, [['UK 5', 'Black']], $shoes);
        $this->product('Dress', 1000, [['M', 'Red']]);

        $this->assertSame(['UK 5'], $this->getJson('/api/products/filters?category=shoes')->json('sizes'));
        $this->assertSame(['Red'], $this->getJson('/api/products/filters?search=dress')->json('colours'));
    }

    public function test_filters_endpoint_offers_top_level_categories_with_rolled_up_counts(): void
    {
        $women = Category::factory()->create(['name' => 'Women', 'slug' => 'women', 'sort_order' => 1]);
        $dresses = Category::factory()->create(['parent_id' => $women->id]);
        $shoes = Category::factory()->create(['name' => 'Shoes', 'slug' => 'shoes', 'sort_order' => 2]);
        Category::factory()->create(['name' => 'Empty', 'slug' => 'empty', 'sort_order' => 3]);

        $this->product('Top', 1000, [], $women);
        $this->product('Maxi', 1000, [], $dresses);
        $this->product('Boot', 1000, [], $shoes);

        $response = $this->getJson('/api/products/filters')->assertOk();

        $this->assertSame(
            [['slug' => 'women', 'name' => 'Women', 'count' => 2], ['slug' => 'shoes', 'name' => 'Shoes', 'count' => 1]],
            $response->json('categories'),
        );
        // Picking a category doesn't narrow the list of categories — the shopper can still switch.
        $this->assertCount(2, $this->getJson('/api/products/filters?category=shoes')->json('categories'));

        // …but a search term does: only categories that have a match are offered.
        $this->assertSame(
            [['slug' => 'shoes', 'name' => 'Shoes', 'count' => 1]],
            $this->getJson('/api/products/filters?search=boot')->json('categories'),
        );
    }

    public function test_listing_is_paginated_with_a_stable_newest_first_order(): void
    {
        foreach (['One', 'Two', 'Three'] as $name) {
            $this->product($name, 1000);
        }

        $first = $this->getJson('/api/products?per_page=2')->assertOk();
        $second = $this->getJson('/api/products?per_page=2&page=2')->assertOk();

        $this->assertSame(3, $first->json('meta.total'));
        $this->assertSame(['Three', 'Two'], collect($first->json('data'))->pluck('name')->all());
        $this->assertSame(['One'], collect($second->json('data'))->pluck('name')->all());
    }
}
