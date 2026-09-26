<?php

namespace Tests\Feature;

use App\Mail\BackInStockMail;
use App\Mail\CartReminderMail;
use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EngagementFeaturesTest extends TestCase
{
    use RefreshDatabase;

    private function purchase(User $user, ProductVariant $variant): void
    {
        $order = Order::create([
            'order_number' => 'MAI-'.uniqid(),
            'user_id' => $user->id,
            'address_id' => Address::factory()->for($user)->create()->id,
            'status' => Order::STATUS_PLACED,
            'subtotal_pence' => 1000, 'vat_pence' => 167, 'total_pence' => 1000, 'currency' => 'GBP',
        ]);
        OrderItem::create([
            'order_id' => $order->id, 'product_variant_id' => $variant->id, 'product_name' => 'X',
            'sku' => $variant->sku, 'unit_price_pence' => 1000, 'quantity' => 1, 'line_total_pence' => 1000,
        ]);
    }

    public function test_wishlist_add_list_remove_and_recommendations(): void
    {
        $user = User::factory()->create();
        $category = Category::factory()->create();
        $saved = Product::factory()->for($category)->create();
        $other = Product::factory()->for($category)->create(['name' => 'Similar']);

        $this->postJson('/api/wishlist', ['product_id' => $saved->id])->assertUnauthorized();

        $this->actingAs($user, 'sanctum');
        $this->postJson('/api/wishlist', ['product_id' => $saved->id])->assertCreated();
        $this->postJson('/api/wishlist', ['product_id' => $saved->id])->assertCreated();

        $this->getJson('/api/wishlist')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/wishlist/recommendations')->assertOk()
            ->assertJsonPath('data.0.name', 'Similar')->assertJsonCount(1, 'data');

        $this->deleteJson("/api/wishlist/{$saved->id}")->assertOk();
        $this->getJson('/api/wishlist')->assertJsonCount(0, 'data');
    }

    public function test_only_verified_buyers_can_review_and_ratings_are_summarised(): void
    {
        $product = Product::factory()->create(['slug' => 'dress']);
        $variant = ProductVariant::factory()->for($product)->create();
        $buyer = User::factory()->create(['name' => 'Ada Lovelace']);
        $stranger = User::factory()->create();
        $this->purchase($buyer, $variant);

        $this->actingAs($stranger, 'sanctum')->postJson('/api/products/dress/reviews', ['rating' => 5])->assertForbidden();

        $this->actingAs($buyer, 'sanctum')->postJson('/api/products/dress/reviews', ['rating' => 4, 'body' => 'Lovely'])->assertCreated();
        $this->postJson('/api/products/dress/reviews', ['rating' => 5])->assertCreated(); // edits, no duplicate
        $this->postJson('/api/products/dress/reviews', ['rating' => 9])->assertUnprocessable();

        $this->getJson('/api/products/dress/reviews')->assertOk()
            ->assertJsonPath('summary.count', 1)
            ->assertJsonPath('summary.average', 5)
            ->assertJsonPath('data.0.author', 'Ada L.');

        $this->getJson('/api/products/dress')->assertJsonPath('data.rating_count', 1);
    }

    public function test_back_in_stock_alert_emails_subscribers_once_on_restock(): void
    {
        Mail::fake();
        $product = Product::factory()->create(['slug' => 'scarf']);
        $variant = ProductVariant::factory()->for($product)->create(['stock_quantity' => 0]);

        $this->postJson('/api/products/scarf/stock-alert', ['email' => 'Fan@Example.com'])->assertCreated();
        $this->postJson('/api/products/scarf/stock-alert', ['email' => 'fan@example.com'])->assertCreated();

        $variant->update(['stock_quantity' => 5]);
        $variant->update(['stock_quantity' => 0]);
        $variant->update(['stock_quantity' => 3]);

        Mail::assertSent(BackInStockMail::class, 1);
    }

    public function test_stock_alert_rejected_when_already_in_stock(): void
    {
        $product = Product::factory()->create(['slug' => 'scarf']);
        ProductVariant::factory()->for($product)->create(['stock_quantity' => 4]);

        $this->postJson('/api/products/scarf/stock-alert', ['email' => 'a@b.com'])->assertUnprocessable();
    }

    public function test_cart_reminder_goes_out_once_for_stale_carts(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $cart = Cart::create(['user_id' => $user->id]);
        CartItem::create(['cart_id' => $cart->id, 'product_variant_id' => ProductVariant::factory()->create()->id, 'quantity' => 1]);
        $cart->forceFill(['updated_at' => now()->subDays(2)])->saveQuietly();

        $this->artisan('carts:remind')->assertSuccessful();
        $this->artisan('carts:remind')->assertSuccessful();

        Mail::assertSent(CartReminderMail::class, 1);
    }

    public function test_products_can_be_fetched_by_slug_list(): void
    {
        Product::factory()->create(['slug' => 'a']);
        Product::factory()->create(['slug' => 'b']);
        Product::factory()->create(['slug' => 'c']);

        $this->getJson('/api/products?slugs=a,c')->assertJsonCount(2, 'data');
    }
}
