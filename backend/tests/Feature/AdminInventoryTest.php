<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminInventoryTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function variant(string $sku, int $stock, int $threshold = 5, ?Product $product = null): ProductVariant
    {
        return ProductVariant::factory()->for($product ?? Product::factory()->create())
            ->create(['sku' => $sku, 'stock_quantity' => $stock, 'low_stock_threshold' => $threshold]);
    }

    private function skus(string $query = ''): array
    {
        return collect($this->actingAs($this->admin())->getJson("/api/admin/inventory{$query}")->assertOk()->json('data'))
            ->pluck('sku')->all();
    }

    public function test_the_default_view_lists_what_needs_attention_most_urgent_first(): void
    {
        $this->variant('LOW-3', 3);
        $this->variant('OUT-1', 0);
        $this->variant('LOW-1', 1);
        $this->variant('FINE-1', 50);

        $this->assertSame(['OUT-1', 'LOW-1', 'LOW-3'], $this->skus());
    }

    public function test_it_filters_to_out_of_stock_low_or_everything(): void
    {
        $this->variant('OUT-1', 0);
        $this->variant('LOW-1', 2);
        $this->variant('FINE-1', 50);

        $this->assertSame(['OUT-1'], $this->skus('?status=out'));
        $this->assertSame(['LOW-1'], $this->skus('?status=low'));
        $this->assertEqualsCanonicalizing(['OUT-1', 'LOW-1', 'FINE-1'], $this->skus('?status=all'));
    }

    public function test_it_searches_by_sku_or_product_name(): void
    {
        $scarf = Product::factory()->create(['name' => 'Silk Scarf']);
        $this->variant('SCARF-S', 0, 5, $scarf);
        $this->variant('SCARF-M', 0, 5, $scarf);
        $this->variant('BAG-1', 0);

        $this->assertEqualsCanonicalizing(['SCARF-S', 'SCARF-M'], $this->skus('?search=silk'));
        $this->assertSame(['BAG-1'], $this->skus('?search=BAG-1'));
    }

    public function test_it_reports_true_totals_for_the_filter_chips_and_paginates(): void
    {
        foreach (range(1, 5) as $i) {
            $this->variant("OUT-{$i}", 0);
        }
        $this->variant('LOW-1', 2);
        $this->variant('FINE-1', 50);

        $response = $this->actingAs($this->admin())->getJson('/api/admin/inventory?status=out&per_page=2')->assertOk();

        $this->assertCount(2, $response->json('data'));
        $this->assertSame(5, $response->json('meta.total'));
        $this->assertSame(['out' => 5, 'low' => 1, 'all' => 7], $response->json('counts'));
    }

    public function test_the_filters_are_validated(): void
    {
        $this->actingAs($this->admin())->getJson('/api/admin/inventory?status=nonsense')->assertJsonValidationErrors('status');
        $this->actingAs($this->admin())->getJson('/api/admin/inventory?per_page=1000')->assertJsonValidationErrors('per_page');
    }

    public function test_only_admins_can_see_inventory(): void
    {
        $this->getJson('/api/admin/inventory')->assertUnauthorized();

        $customer = User::factory()->create(['role' => 'customer']);
        $this->actingAs($customer)->getJson('/api/admin/inventory')->assertForbidden();
    }

    public function test_the_dashboard_caps_its_lists_but_reports_true_counts(): void
    {
        foreach (range(1, 25) as $i) {
            $this->variant("LOW-{$i}", 1);
        }
        foreach (range(1, 22) as $i) {
            $this->variant("OUT-{$i}", 0);
        }

        $response = $this->actingAs($this->admin())->getJson('/api/admin/dashboard')->assertOk();

        $this->assertCount(20, $response->json('low_stock'));
        $this->assertSame(25, $response->json('low_stock_count'));
        $this->assertCount(20, $response->json('out_of_stock'));
        $this->assertSame(22, $response->json('out_of_stock_count'));
    }
}
