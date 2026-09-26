<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminProductManagementTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    public function test_a_product_with_no_order_history_can_be_deleted(): void
    {
        $admin = $this->admin();
        $product = Product::factory()->create();
        $product->variants()->create(['sku' => 'SKU-1', 'stock_quantity' => 5]);

        $this->actingAs($admin)->deleteJson("/api/admin/products/{$product->id}")
            ->assertOk()
            ->assertJson(['message' => 'Product deleted.']);

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }

    public function test_a_product_that_has_been_ordered_cannot_be_deleted(): void
    {
        $admin = $this->admin();
        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->for($product)->create();

        $customer = User::factory()->create();
        $order = Order::create([
            'order_number' => 'MAI-TEST-PROD-DEL',
            'user_id' => $customer->id,
            'address_id' => Address::factory()->for($customer)->create()->id,
            'status' => Order::STATUS_DELIVERED,
            'subtotal_pence' => 1000,
            'vat_pence' => 167,
            'total_pence' => 1000,
            'currency' => 'GBP',
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'product_variant_id' => $variant->id,
            'product_name' => $product->name,
            'sku' => $variant->sku,
            'unit_price_pence' => 1000,
            'quantity' => 1,
            'line_total_pence' => 1000,
        ]);

        $response = $this->actingAs($admin)->deleteJson("/api/admin/products/{$product->id}");

        $response->assertStatus(409)->assertJsonFragment(['message' => 'This product has been ordered before (1 order(s)). Deactivate it instead of deleting it, to keep past orders intact.']);
        $this->assertDatabaseHas('products', ['id' => $product->id]);
    }

    public function test_customers_and_guests_cannot_delete_products(): void
    {
        $product = Product::factory()->create();

        $this->deleteJson("/api/admin/products/{$product->id}")->assertUnauthorized();

        $customer = User::factory()->create(['role' => 'customer']);
        $this->actingAs($customer)->deleteJson("/api/admin/products/{$product->id}")->assertForbidden();
        $this->assertDatabaseHas('products', ['id' => $product->id]);
    }

    public function test_a_variant_can_be_created_updated_and_deleted(): void
    {
        $admin = $this->admin();
        $product = Product::factory()->create();

        $created = $this->actingAs($admin)->postJson("/api/admin/products/{$product->id}/variants", [
            'sku' => 'SKU-NEW', 'size' => 'M', 'colour' => 'Black', 'stock_quantity' => 12, 'low_stock_threshold' => 3,
        ])->assertCreated();
        $variantId = $created->json('data.id');
        $this->assertDatabaseHas('product_variants', ['id' => $variantId, 'stock_quantity' => 12, 'low_stock_threshold' => 3]);

        $this->actingAs($admin)->putJson("/api/admin/variants/{$variantId}", [
            'sku' => 'SKU-NEW', 'stock_quantity' => 20, 'low_stock_threshold' => 3,
        ])->assertOk()->assertJsonPath('data.stock_quantity', 20);

        $this->actingAs($admin)->deleteJson("/api/admin/variants/{$variantId}")->assertOk();
        $this->assertDatabaseMissing('product_variants', ['id' => $variantId]);
    }

    /**
     * Regression: the admin edit form used to default every variant's threshold
     * field to "5" regardless of what was actually stored, so opening "Edit" and
     * saving silently reset a deliberately-chosen threshold back to 5. The fix is
     * in the frontend form, but it only works if the API actually exposes the
     * real value for the form to read — assert that here.
     */
    public function test_a_variants_low_stock_threshold_is_exposed_so_the_edit_form_can_show_the_real_value(): void
    {
        $admin = $this->admin();
        $product = Product::factory()->create();
        $variant = $product->variants()->create(['sku' => 'SKU-1', 'stock_quantity' => 10, 'low_stock_threshold' => 2]);

        $response = $this->actingAs($admin)->getJson("/api/admin/products/{$product->id}")->assertOk();

        $this->assertSame(2, collect($response->json('data.variants'))->firstWhere('id', $variant->id)['low_stock_threshold']);
    }
}
