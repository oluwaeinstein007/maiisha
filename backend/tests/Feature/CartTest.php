<?php

namespace Tests\Feature;

use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CarriesSessionCookies;
use Tests\TestCase;

class CartTest extends TestCase
{
    use CarriesSessionCookies, RefreshDatabase;

    public function test_a_guest_can_add_an_item_to_a_session_backed_cart(): void
    {
        $variant = ProductVariant::factory()->create(['stock_quantity' => 5]);

        $response = $this->postJson('/api/cart/items', [
            'product_variant_id' => $variant->id,
            'quantity' => 2,
        ]);

        $response->assertCreated();
        $this->assertEquals(2, $response->json('data.items.0.quantity'));
        $this->assertDatabaseCount('carts', 1);
        $this->assertDatabaseHas('carts', ['user_id' => null]);
    }

    public function test_adding_more_than_available_stock_is_rejected(): void
    {
        $variant = ProductVariant::factory()->create(['stock_quantity' => 2]);

        $response = $this->postJson('/api/cart/items', [
            'product_variant_id' => $variant->id,
            'quantity' => 3,
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('quantity');
    }

    public function test_adding_the_same_variant_twice_increments_quantity_instead_of_duplicating(): void
    {
        $variant = ProductVariant::factory()->create(['stock_quantity' => 10]);

        $first = $this->postJson('/api/cart/items', ['product_variant_id' => $variant->id, 'quantity' => 2]);
        $response = $this->withCookies($this->plainCookiesFrom($first))
            ->postJson('/api/cart/items', ['product_variant_id' => $variant->id, 'quantity' => 3]);

        $response->assertOk();
        $this->assertCount(1, $response->json('data.items'));
        $this->assertEquals(5, $response->json('data.items.0.quantity'));
    }

    public function test_a_logged_in_users_cart_is_tied_to_their_account(): void
    {
        $user = User::factory()->create();
        $variant = ProductVariant::factory()->create(['stock_quantity' => 5]);

        $this->actingAs($user)->postJson('/api/cart/items', [
            'product_variant_id' => $variant->id,
            'quantity' => 1,
        ])->assertCreated();

        $this->assertDatabaseHas('carts', ['user_id' => $user->id]);
    }

    public function test_guest_cart_merges_into_user_cart_on_login(): void
    {
        $variant = ProductVariant::factory()->create(['stock_quantity' => 5]);
        $user = User::factory()->create(['password' => bcrypt('password123')]);

        // Guest adds an item, then logs in as the same client (session cookie carried across requests).
        $addResponse = $this->postJson('/api/cart/items', ['product_variant_id' => $variant->id, 'quantity' => 2]);
        $addResponse->assertCreated();

        $this->withCookies($this->plainCookiesFrom($addResponse))->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertOk();

        $userCart = $user->carts()->with('items')->first();
        $this->assertNotNull($userCart);
        $this->assertEquals(2, $userCart->items->first()->quantity);
    }
}
