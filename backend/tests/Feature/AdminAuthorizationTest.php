<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\DiscountCode;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_guest_cannot_reach_admin_routes(): void
    {
        $this->getJson('/api/admin/dashboard')->assertUnauthorized();
    }

    public function test_a_regular_customer_is_forbidden_from_admin_routes(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $this->actingAs($customer)->getJson('/api/admin/dashboard')->assertForbidden();
    }

    public function test_an_admin_can_reach_admin_routes(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->getJson('/api/admin/dashboard')->assertOk();
    }

    public function test_an_admin_can_manage_categories(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->postJson('/api/admin/categories', [
            'name' => 'New Arrivals',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('categories', ['name' => 'New Arrivals', 'slug' => 'new-arrivals']);
    }

    public function test_deleting_a_category_with_products_is_blocked(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $category = Category::factory()->create();
        Product::factory()->for($category)->create();

        $response = $this->actingAs($admin)->deleteJson("/api/admin/categories/{$category->id}");

        $response->assertStatus(409);
        $this->assertDatabaseHas('categories', ['id' => $category->id]);
    }

    public function test_an_empty_category_can_be_deleted(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $category = Category::factory()->create();

        $this->actingAs($admin)->deleteJson("/api/admin/categories/{$category->id}")->assertOk();

        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
    }

    public function test_a_customer_cannot_create_categories(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $this->actingAs($customer)
            ->postJson('/api/admin/categories', ['name' => 'Hacked Category'])
            ->assertForbidden();

        $this->assertDatabaseMissing('categories', ['name' => 'Hacked Category']);
    }

    public function test_an_admin_can_deactivate_a_discount_code_without_deleting_it(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $code = DiscountCode::factory()->create(['is_active' => true]);

        $this->actingAs($admin)
            ->deleteJson("/api/admin/discount-codes/{$code->id}")
            ->assertOk();

        $this->assertDatabaseHas('discount_codes', ['id' => $code->id, 'is_active' => false]);
    }

    public function test_a_percentage_discount_code_cannot_exceed_100(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->postJson('/api/admin/discount-codes', [
            'code' => 'TOOMUCH',
            'type' => 'percentage',
            'value' => 150,
        ])->assertUnprocessable()->assertJsonValidationErrors('value');
    }

    public function test_discount_codes_are_stored_uppercased_regardless_of_input_case(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->postJson('/api/admin/discount-codes', [
            'code' => 'save10',
            'type' => 'percentage',
            'value' => 10,
        ])->assertCreated();

        $this->assertDatabaseHas('discount_codes', ['code' => 'SAVE10']);
        $this->assertDatabaseMissing('discount_codes', ['code' => 'save10']);
    }
}
