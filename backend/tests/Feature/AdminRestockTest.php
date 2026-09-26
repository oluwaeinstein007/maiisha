<?php

namespace Tests\Feature;

use App\Mail\BackInStockMail;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AdminRestockTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    public function test_restocking_adds_to_the_current_stock(): void
    {
        $variant = ProductVariant::factory()->create(['stock_quantity' => 3, 'low_stock_threshold' => 5]);

        $response = $this->actingAs($this->admin())->postJson("/api/admin/variants/{$variant->id}/restock", ['quantity' => 10]);

        $response->assertOk()->assertJsonPath('data.stock_quantity', 13);
        $this->assertSame(13, $variant->fresh()->stock_quantity);
    }

    public function test_restocking_adds_to_the_live_figure_not_a_stale_one(): void
    {
        $variant = ProductVariant::factory()->create(['stock_quantity' => 3]);
        // An order lands after the dashboard was loaded, taking stock to 1.
        ProductVariant::whereKey($variant->id)->update(['stock_quantity' => 1]);

        $this->actingAs($this->admin())->postJson("/api/admin/variants/{$variant->id}/restock", ['quantity' => 10])->assertOk();

        $this->assertSame(11, $variant->fresh()->stock_quantity);
    }

    public function test_the_quantity_must_be_a_positive_whole_number(): void
    {
        $variant = ProductVariant::factory()->create(['stock_quantity' => 3]);
        $admin = $this->admin();

        foreach ([null, 0, -5, 1.5, 'abc', 100001] as $bad) {
            $this->actingAs($admin)->postJson("/api/admin/variants/{$variant->id}/restock", ['quantity' => $bad])
                ->assertJsonValidationErrors('quantity');
        }

        $this->assertSame(3, $variant->fresh()->stock_quantity);
    }

    public function test_only_admins_can_restock(): void
    {
        $variant = ProductVariant::factory()->create(['stock_quantity' => 3]);

        $this->postJson("/api/admin/variants/{$variant->id}/restock", ['quantity' => 5])->assertUnauthorized();

        $customer = User::factory()->create(['role' => 'customer']);
        $this->actingAs($customer)->postJson("/api/admin/variants/{$variant->id}/restock", ['quantity' => 5])->assertForbidden();

        $this->assertSame(3, $variant->fresh()->stock_quantity);
    }

    public function test_restocking_a_sold_out_variant_emails_shoppers_waiting_for_it(): void
    {
        Mail::fake();
        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->for($product)->create(['stock_quantity' => 0]);
        $product->stockAlerts()->create(['email' => 'waiting@example.com']);

        $this->actingAs($this->admin())->postJson("/api/admin/variants/{$variant->id}/restock", ['quantity' => 4])->assertOk();

        Mail::assertSent(BackInStockMail::class, fn (BackInStockMail $mail) => $mail->hasTo('waiting@example.com'));
    }

    public function test_the_dashboard_lists_out_of_stock_variants_so_they_can_be_restocked(): void
    {
        $product = Product::factory()->create(['name' => 'Silk Scarf']);
        $out = ProductVariant::factory()->for($product)->create(['sku' => 'OUT-1', 'size' => 'M', 'colour' => 'Red', 'stock_quantity' => 0]);
        ProductVariant::factory()->for($product)->create(['sku' => 'LOW-1', 'stock_quantity' => 2, 'low_stock_threshold' => 5]);
        ProductVariant::factory()->for($product)->create(['sku' => 'FINE-1', 'stock_quantity' => 50, 'low_stock_threshold' => 5]);

        $response = $this->actingAs($this->admin())->getJson('/api/admin/dashboard')->assertOk();

        $this->assertSame(1, $response->json('out_of_stock_count'));
        $this->assertSame(['OUT-1'], collect($response->json('out_of_stock'))->pluck('sku')->all());
        $this->assertSame(['LOW-1'], collect($response->json('low_stock'))->pluck('sku')->all());
        $row = $response->json('out_of_stock.0');
        $this->assertSame($out->id, $row['variant_id']);
        $this->assertSame('Silk Scarf', $row['product_name']);
        $this->assertSame('M', $row['size']);
        $this->assertSame('Red', $row['colour']);
    }
}
