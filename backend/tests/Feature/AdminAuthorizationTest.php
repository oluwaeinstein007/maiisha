<?php

namespace Tests\Feature;

use App\Models\DiscountCode;
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
}
