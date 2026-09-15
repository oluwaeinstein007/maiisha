<?php

namespace Tests\Feature;

use App\Mail\OrderStatusMail;
use App\Models\Address;
use App\Models\DiscountCode;
use App\Models\DiscountCodeUsage;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Testing\TestResponse;
use Stripe\WebhookSignature;
use Tests\TestCase;

class StripeWebhookTest extends TestCase
{
    use RefreshDatabase;

    private function postWebhookEvent(array $event): TestResponse
    {
        $payload = json_encode($event);
        $secret = config('services.stripe.webhook_secret');
        $header = WebhookSignature::generateSignatureHeader($payload, $secret);

        return $this->call('POST', '/api/webhooks/stripe', [], [], [], [
            'HTTP_Stripe-Signature' => $header,
            'CONTENT_TYPE' => 'application/json',
        ], $payload);
    }

    private function pendingOrderWithPayment(): array
    {
        $user = User::factory()->create(['phone' => '+447700900000']);
        $variant = ProductVariant::factory()->create(['stock_quantity' => 3]);
        $discount = DiscountCode::factory()->create();

        $order = Order::create([
            'order_number' => 'MAI-WEBHOOK-1',
            'user_id' => $user->id,
            'address_id' => Address::factory()->for($user)->create()->id,
            'discount_code_id' => $discount->id,
            'status' => Order::STATUS_PENDING_PAYMENT,
            'subtotal_pence' => 1000,
            'vat_pence' => 167,
            'total_pence' => 1000,
            'currency' => 'GBP',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_variant_id' => $variant->id,
            'product_name' => 'Test Product',
            'sku' => $variant->sku,
            'unit_price_pence' => 1000,
            'quantity' => 2,
            'line_total_pence' => 1000,
        ]);

        $payment = Payment::create([
            'order_id' => $order->id,
            'provider' => 'stripe',
            'provider_reference' => 'pi_test_123',
            'status' => 'pending',
            'amount_pence' => 1000,
            'currency' => 'GBP',
        ]);

        DiscountCodeUsage::create(['discount_code_id' => $discount->id, 'user_id' => $user->id, 'order_id' => $order->id]);

        return compact('order', 'payment', 'variant');
    }

    public function test_a_valid_signature_is_required(): void
    {
        $response = $this->postJson('/api/webhooks/stripe', ['type' => 'payment_intent.succeeded'], [
            'Stripe-Signature' => 'invalid',
        ]);

        $response->assertStatus(400);
    }

    public function test_payment_intent_succeeded_marks_the_order_placed_and_notifies_the_customer(): void
    {
        Mail::fake();
        ['order' => $order, 'payment' => $payment] = $this->pendingOrderWithPayment();

        $response = $this->postWebhookEvent([
            'id' => 'evt_1',
            'type' => 'payment_intent.succeeded',
            'data' => ['object' => ['id' => $payment->provider_reference]],
        ]);

        $response->assertOk();
        $this->assertEquals('succeeded', $payment->fresh()->status);
        $this->assertEquals(Order::STATUS_PLACED, $order->fresh()->status);
        Mail::assertSent(OrderStatusMail::class);
    }

    public function test_payment_intent_failed_cancels_the_order_and_releases_stock_and_discount_usage(): void
    {
        ['order' => $order, 'payment' => $payment, 'variant' => $variant] = $this->pendingOrderWithPayment();
        $stockBefore = $variant->stock_quantity;

        $response = $this->postWebhookEvent([
            'id' => 'evt_2',
            'type' => 'payment_intent.payment_failed',
            'data' => ['object' => ['id' => $payment->provider_reference]],
        ]);

        $response->assertOk();
        $this->assertEquals('failed', $payment->fresh()->status);
        $this->assertEquals(Order::STATUS_CANCELLED, $order->fresh()->status);
        $this->assertEquals($stockBefore + 2, $variant->fresh()->stock_quantity);
        $this->assertDatabaseCount('discount_code_usages', 0);
    }

    public function test_an_unknown_payment_intent_id_is_ignored_gracefully(): void
    {
        $response = $this->postWebhookEvent([
            'id' => 'evt_3',
            'type' => 'payment_intent.succeeded',
            'data' => ['object' => ['id' => 'pi_does_not_exist']],
        ]);

        $response->assertOk();
    }
}
