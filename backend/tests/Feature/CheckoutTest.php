<?php

namespace Tests\Feature;

use App\Contracts\PaymentGateway;
use App\Models\Address;
use App\Models\DiscountCode;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\FakePaymentGateway;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    private function fakeGateway(): FakePaymentGateway
    {
        $fake = new FakePaymentGateway;
        $this->app->instance(PaymentGateway::class, $fake);

        return $fake;
    }

    public function test_preview_computes_subtotal_discount_vat_and_shipping(): void
    {
        $user = User::factory()->create();

        // £30, below the £50 free-shipping threshold, so the flat shipping fee applies too.
        $variant = ProductVariant::factory()->create(['stock_quantity' => 10]);
        $variant->product()->update(['price_pence' => 3000]);

        $this->actingAs($user)->postJson('/api/cart/items', ['product_variant_id' => $variant->id, 'quantity' => 1])
            ->assertCreated();

        DiscountCode::factory()->create(['code' => 'SAVE10', 'type' => 'percentage', 'value' => 10]);

        $response = $this->actingAs($user)->postJson('/api/checkout/preview', ['discount_code' => 'SAVE10']);

        $response->assertOk();
        // subtotal 3000, 10% off = 300 discount, +399 flat shipping (under threshold)
        // => taxable total 3099; VAT is the 20% portion already included in that total.
        $response->assertJson([
            'subtotal_pence' => 3000,
            'discount_pence' => 300,
            'shipping_pence' => 399,
            'total_pence' => 3099,
        ]);
        $this->assertEquals(517, $response->json('vat_pence'));
    }

    public function test_preview_rejects_an_invalid_discount_code(): void
    {
        $user = User::factory()->create();
        $variant = ProductVariant::factory()->create(['stock_quantity' => 10]);
        $this->actingAs($user)->postJson('/api/cart/items', ['product_variant_id' => $variant->id, 'quantity' => 1]);

        $this->actingAs($user)->postJson('/api/checkout/preview', ['discount_code' => 'NOPE'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('discount_code');
    }

    public function test_a_customer_can_complete_checkout_and_stock_is_reserved(): void
    {
        $gateway = $this->fakeGateway();
        $user = User::factory()->create();
        $address = Address::factory()->for($user)->create();
        $variant = ProductVariant::factory()->create(['stock_quantity' => 5]);

        $this->actingAs($user)->postJson('/api/cart/items', [
            'product_variant_id' => $variant->id,
            'quantity' => 2,
        ])->assertCreated();

        $response = $this->actingAs($user)->postJson('/api/checkout', ['address_id' => $address->id]);

        $response->assertOk()->assertJsonStructure(['order', 'client_secret']);
        $this->assertCount(1, $gateway->calls);

        $order = Order::first();
        $this->assertEquals(Order::STATUS_PENDING_PAYMENT, $order->status);
        $this->assertEquals(3, $variant->fresh()->stock_quantity, 'stock should be reserved immediately at checkout');
        $this->assertDatabaseCount('cart_items', 0);
    }

    public function test_checkout_fails_cleanly_and_releases_stock_when_the_gateway_errors(): void
    {
        $gateway = $this->fakeGateway();
        $gateway->shouldFail = true;

        $user = User::factory()->create();
        $address = Address::factory()->for($user)->create();
        $variant = ProductVariant::factory()->create(['stock_quantity' => 5]);

        $this->actingAs($user)->postJson('/api/cart/items', [
            'product_variant_id' => $variant->id,
            'quantity' => 2,
        ]);

        $response = $this->actingAs($user)->postJson('/api/checkout', ['address_id' => $address->id]);

        $response->assertUnprocessable();
        $this->assertEquals(5, $variant->fresh()->stock_quantity, 'stock must be released when the gateway fails');
        $this->assertEquals(Order::STATUS_CANCELLED, Order::first()->status);
    }

    public function test_checkout_rejects_an_order_for_someone_elses_address(): void
    {
        $user = User::factory()->create();
        $otherUsersAddress = Address::factory()->create();
        $variant = ProductVariant::factory()->create(['stock_quantity' => 5]);

        $this->actingAs($user)->postJson('/api/cart/items', ['product_variant_id' => $variant->id, 'quantity' => 1]);

        $this->actingAs($user)
            ->postJson('/api/checkout', ['address_id' => $otherUsersAddress->id])
            ->assertForbidden();
    }
}
