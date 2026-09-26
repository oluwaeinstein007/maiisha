<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Review;
use App\Models\StockAlert;
use App\Models\User;
use App\Models\WishlistItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminEngagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_customers_cannot_moderate_reviews_or_see_demand(): void
    {
        $customer = User::factory()->create();
        $review = Review::create(['product_id' => Product::factory()->create()->id, 'user_id' => $customer->id, 'rating' => 1]);

        $this->getJson('/api/admin/reviews')->assertUnauthorized();
        $this->actingAs($customer)->getJson('/api/admin/reviews')->assertForbidden();
        $this->actingAs($customer)->deleteJson("/api/admin/reviews/{$review->id}")->assertForbidden();
        $this->actingAs($customer)->getJson('/api/admin/demand')->assertForbidden();
    }

    public function test_admin_lists_filters_and_removes_reviews(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $product = Product::factory()->create(['name' => 'Silk Scarf']);
        $bad = Review::create(['product_id' => $product->id, 'user_id' => User::factory()->create()->id, 'rating' => 1, 'body' => 'rude text']);
        Review::create(['product_id' => $product->id, 'user_id' => User::factory()->create()->id, 'rating' => 5]);

        $this->actingAs($admin)->getJson('/api/admin/reviews')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/admin/reviews?rating=1')->assertJsonCount(1, 'data')->assertJsonPath('data.0.product.name', 'Silk Scarf');
        $this->getJson('/api/admin/reviews?search=scarf')->assertJsonCount(2, 'data');

        $this->deleteJson("/api/admin/reviews/{$bad->id}")->assertOk();
        $this->assertDatabaseMissing('reviews', ['id' => $bad->id]);
    }

    public function test_demand_ranks_products_by_waiting_customers_then_wishlist_saves(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $wanted = Product::factory()->create(['name' => 'Wanted']);
        $saved = Product::factory()->create(['name' => 'Saved']);
        Product::factory()->create(['name' => 'Ignored']);

        StockAlert::create(['product_id' => $wanted->id, 'email' => 'a@b.com']);
        StockAlert::create(['product_id' => $wanted->id, 'email' => 'c@d.com', 'notified_at' => now()]);
        WishlistItem::create(['user_id' => User::factory()->create()->id, 'product_id' => $saved->id]);
        WishlistItem::create(['user_id' => User::factory()->create()->id, 'product_id' => $saved->id]);

        $response = $this->actingAs($admin)->getJson('/api/admin/demand')->assertOk();

        $this->assertSame(['Wanted', 'Saved'], collect($response->json('data'))->pluck('name')->all());
        $this->assertSame(1, $response->json('data.0.waiting_count'));
        $this->assertSame(2, $response->json('data.1.wishlist_count'));
    }
}
