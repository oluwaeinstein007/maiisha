<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSaleManagementTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    /** @return array<string, mixed> */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Christmas Sale',
            'description' => 'Up to 30% off',
            'type' => 'percentage',
            'value' => 20,
            'applies_to' => 'all',
        ], $overrides);
    }

    public function test_guests_and_customers_cannot_manage_sales(): void
    {
        $this->getJson('/api/admin/sales')->assertUnauthorized();

        $customer = User::factory()->create(['role' => 'customer']);
        $this->actingAs($customer)->getJson('/api/admin/sales')->assertForbidden();
        $this->actingAs($customer)->postJson('/api/admin/sales', $this->payload())->assertForbidden();
    }

    public function test_an_admin_can_create_a_sale_that_is_immediately_live(): void
    {
        $response = $this->actingAs($this->admin())->postJson('/api/admin/sales', $this->payload());

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Christmas Sale')
            ->assertJsonPath('data.status', 'live')
            ->assertJsonPath('data.discount_label', '20% off')
            ->assertJsonPath('data.is_active', true);
    }

    public function test_dates_are_read_as_shop_time_and_stored_as_utc(): void
    {
        $admin = $this->admin();

        // July: the UK is on BST (UTC+1), so UK midnight is 23:00 UTC the day before.
        $summer = $this->actingAs($admin)->postJson('/api/admin/sales', $this->payload([
            'starts_at' => '2026-07-01T00:00',
            'ends_at' => '2026-07-05T23:59',
        ]))->assertCreated();

        $this->assertSame('2026-06-30 23:00:00', Sale::find($summer->json('data.id'))->starts_at->format('Y-m-d H:i:s'));
        // …and it round-trips back to the wall-clock time the admin typed.
        $summer->assertJsonPath('data.starts_at_local', '2026-07-01T00:00')
            ->assertJsonPath('data.ends_at_local', '2026-07-05T23:59');

        // December: GMT, so no shift.
        $winter = $this->actingAs($admin)->postJson('/api/admin/sales', $this->payload([
            'starts_at' => '2026-12-01T00:00',
        ]))->assertCreated();

        $this->assertSame('2026-12-01 00:00:00', Sale::find($winter->json('data.id'))->starts_at->format('Y-m-d H:i:s'));
    }

    public function test_status_distinguishes_live_scheduled_ended_and_inactive(): void
    {
        $admin = $this->admin();
        $create = fn (array $o) => $this->actingAs($admin)->postJson('/api/admin/sales', $this->payload($o))->json('data.status');

        $this->assertSame('live', $create([]));
        $this->assertSame('scheduled', $create(['starts_at' => now()->addWeek()->format('Y-m-d\TH:i')]));
        $this->assertSame('ended', $create(['ends_at' => now()->subWeek()->format('Y-m-d\TH:i')]));
        $this->assertSame('inactive', $create(['is_active' => false]));
    }

    public function test_a_selection_can_mix_lines_brands_and_products(): void
    {
        $admin = $this->admin();
        $category = Category::factory()->create();
        $brand = Brand::factory()->create();
        $product = Product::factory()->create();

        $response = $this->actingAs($admin)->postJson('/api/admin/sales', $this->payload([
            'applies_to' => 'selected',
            'category_ids' => [$category->id],
            'brand_ids' => [$brand->id],
            'product_ids' => [$product->id],
        ]))->assertCreated();

        $response->assertJsonPath('data.category_ids', [$category->id])
            ->assertJsonPath('data.brand_ids', [$brand->id])
            ->assertJsonPath('data.product_ids', [$product->id])
            ->assertJsonPath('data.brands.0.name', $brand->name);
    }

    public function test_a_sale_can_be_saved_as_an_empty_draft_and_have_items_added_later(): void
    {
        $admin = $this->admin();
        $product = Product::factory()->create(['price_pence' => 10000]);
        $product->variants()->create(['sku' => 'S-1', 'stock_quantity' => 5]);

        $draft = $this->actingAs($admin)->postJson('/api/admin/sales', $this->payload([
            'name' => 'Black Friday', 'applies_to' => 'selected', 'is_active' => false,
        ]))->assertCreated()->assertJsonPath('data.status', 'inactive');
        $id = $draft->json('data.id');

        // No dates and no items: even if it were on it would change nothing, and it's off anyway.
        $this->assertSame(10000, $this->getJson('/api/products')->json('data.0.min_price_pence'));

        // Add a product, then switch it on — prices change only at that point.
        $this->actingAs($admin)->putJson("/api/admin/sales/{$id}", $this->payload([
            'name' => 'Black Friday', 'applies_to' => 'selected', 'product_ids' => [$product->id], 'is_active' => false,
        ]))->assertOk();
        $this->assertSame(10000, $this->getJson('/api/products')->json('data.0.min_price_pence'));

        $this->actingAs($admin)->postJson("/api/admin/sales/{$id}/activate")
            ->assertOk()
            ->assertJsonPath('data.status', 'live')
            ->assertJsonPath('data.is_active', true);
        $this->assertSame(8000, $this->getJson('/api/products')->json('data.0.min_price_pence'));

        $this->actingAs($admin)->deleteJson("/api/admin/sales/{$id}")->assertOk();
        $this->assertSame(10000, $this->getJson('/api/products')->json('data.0.min_price_pence'));
    }

    public function test_only_admins_can_activate_a_sale(): void
    {
        $sale = Sale::factory()->create(['is_active' => false]);

        $this->postJson("/api/admin/sales/{$sale->id}/activate")->assertUnauthorized();
        $this->actingAs(User::factory()->create(['role' => 'customer']))
            ->postJson("/api/admin/sales/{$sale->id}/activate")->assertForbidden();
        $this->assertFalse($sale->fresh()->is_active);
    }

    public function test_a_sale_can_be_scoped_to_categories_or_products(): void
    {
        $admin = $this->admin();
        $category = Category::factory()->create();
        $product = Product::factory()->create();

        $byCategory = $this->actingAs($admin)->postJson('/api/admin/sales', $this->payload([
            'applies_to' => 'selected', 'category_ids' => [$category->id],
        ]))->assertCreated();
        $byCategory->assertJsonPath('data.category_ids', [$category->id]);

        $byProduct = $this->actingAs($admin)->postJson('/api/admin/sales', $this->payload([
            'applies_to' => 'selected', 'product_ids' => [$product->id],
        ]))->assertCreated();
        $byProduct->assertJsonPath('data.product_ids', [$product->id]);
    }

    public function test_validation_rejects_bad_sales(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->postJson('/api/admin/sales', $this->payload(['value' => 100]))
            ->assertJsonValidationErrors('value');

        // A fixed amount isn't capped at 99 — that limit is for percentages only.
        $this->actingAs($admin)->postJson('/api/admin/sales', $this->payload(['type' => 'fixed', 'value' => 500]))
            ->assertCreated();

        // Scope is whole-shop or a selection; the old per-type values are gone.
        $this->actingAs($admin)->postJson('/api/admin/sales', $this->payload(['applies_to' => 'categories']))
            ->assertJsonValidationErrors('applies_to');

        $this->actingAs($admin)->postJson('/api/admin/sales', $this->payload([
            'applies_to' => 'selected', 'category_ids' => [999], 'brand_ids' => [999], 'product_ids' => [999],
        ]))->assertJsonValidationErrors(['category_ids.0', 'brand_ids.0', 'product_ids.0']);

        $this->actingAs($admin)->postJson('/api/admin/sales', $this->payload([
            'starts_at' => '2026-12-10T00:00', 'ends_at' => '2026-12-01T00:00',
        ]))->assertJsonValidationErrors('ends_at');

        $this->actingAs($admin)->postJson('/api/admin/sales', $this->payload(['active_weekdays' => [0, 8]]))
            ->assertJsonValidationErrors(['active_weekdays.0', 'active_weekdays.1']);

        $this->actingAs($admin)->postJson('/api/admin/sales', $this->payload(['type' => 'bogus']))
            ->assertJsonValidationErrors('type');
    }

    public function test_weekdays_are_normalised_and_every_day_means_no_restriction(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->postJson('/api/admin/sales', $this->payload(['active_weekdays' => [5, 1, 1, 6]]))
            ->assertJsonPath('data.active_weekdays', [1, 5, 6]);

        $this->actingAs($admin)->postJson('/api/admin/sales', $this->payload(['active_weekdays' => [1, 2, 3, 4, 5, 6, 7]]))
            ->assertJsonPath('data.active_weekdays', null);

        $this->actingAs($admin)->postJson('/api/admin/sales', $this->payload(['active_weekdays' => []]))
            ->assertJsonPath('data.active_weekdays', null);
    }

    public function test_updating_a_sale_replaces_its_scope(): void
    {
        $admin = $this->admin();
        $category = Category::factory()->create();
        $sale = Sale::factory()->create(['applies_to' => 'selected']);
        $sale->categories()->sync([$category->id]);

        $this->actingAs($admin)->putJson("/api/admin/sales/{$sale->id}", $this->payload(['value' => 35]))
            ->assertOk()
            ->assertJsonPath('data.value', 35)
            ->assertJsonPath('data.applies_to', 'all')
            ->assertJsonPath('data.category_ids', []);

        $this->assertDatabaseCount('sale_category', 0);
    }

    public function test_an_edit_reaches_the_storefront_straight_away(): void
    {
        $admin = $this->admin();
        $product = Product::factory()->create(['price_pence' => 10000]);
        $product->variants()->create(['sku' => 'S-1', 'stock_quantity' => 5]);

        $created = $this->actingAs($admin)->postJson('/api/admin/sales', $this->payload(['value' => 20]));
        $this->assertSame(8000, $this->getJson('/api/products')->json('data.0.min_price_pence'));

        $this->actingAs($admin)->putJson('/api/admin/sales/'.$created->json('data.id'), $this->payload(['value' => 50]));
        $this->assertSame(5000, $this->getJson('/api/products')->json('data.0.min_price_pence'));
    }

    public function test_deleting_a_sale_only_deactivates_it(): void
    {
        $admin = $this->admin();
        $sale = Sale::factory()->create();

        $this->actingAs($admin)->deleteJson("/api/admin/sales/{$sale->id}")->assertOk();

        $this->assertFalse($sale->fresh()->is_active);
        $this->actingAs($admin)->getJson("/api/admin/sales/{$sale->id}")->assertJsonPath('data.status', 'inactive');
    }

    public function test_the_index_lists_every_sale_newest_first_with_its_scope(): void
    {
        $admin = $this->admin();
        $category = Category::factory()->create(['name' => 'Shoes']);
        Sale::factory()->create(['name' => 'Old']);
        $newer = Sale::factory()->create(['name' => 'New', 'applies_to' => 'selected']);
        $newer->categories()->sync([$category->id]);

        $response = $this->actingAs($admin)->getJson('/api/admin/sales')->assertOk();

        $this->assertSame(['New', 'Old'], collect($response->json('data'))->pluck('name')->all());
        $response->assertJsonPath('data.0.categories.0.name', 'Shoes');
    }
}
