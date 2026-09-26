<?php

namespace Tests\Feature;

use App\Contracts\PaymentGateway;
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
use Tests\Support\FakePaymentGateway;
use Tests\TestCase;

class AdminOrderManagementTest extends TestCase
{
    use RefreshDatabase;

    private function placedOrder(): Order
    {
        $customer = User::factory()->create(['phone' => '+447700900000']);
        $variant = ProductVariant::factory()->create();

        $order = Order::create([
            'order_number' => 'MAI-TEST-1',
            'user_id' => $customer->id,
            'address_id' => Address::factory()->for($customer)->create()->id,
            'status' => Order::STATUS_PLACED,
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
            'quantity' => 1,
            'line_total_pence' => 1000,
        ]);

        return $order;
    }

    public function test_marking_an_order_shipped_creates_a_shipment_and_notifies_the_customer(): void
    {
        Mail::fake();
        $admin = User::factory()->create(['role' => 'admin']);
        $order = $this->placedOrder();

        $response = $this->actingAs($admin)->patchJson("/api/admin/orders/{$order->id}/status", [
            'status' => 'shipped',
        ]);

        $response->assertOk();
        $order->refresh();
        $this->assertEquals('shipped', $order->status);
        $this->assertNotNull($order->shipped_at);
        $this->assertDatabaseHas('shipments', ['order_id' => $order->id, 'status' => 'in_transit']);
        Mail::assertSent(OrderStatusMail::class);
    }

    public function test_marking_an_order_delivered_updates_the_shipment_status(): void
    {
        Mail::fake();
        $admin = User::factory()->create(['role' => 'admin']);
        $order = $this->placedOrder();

        $this->actingAs($admin)->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'shipped']);
        $this->actingAs($admin)->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'delivered'])
            ->assertOk();

        $order->refresh();
        $this->assertEquals('delivered', $order->status);
        $this->assertNotNull($order->delivered_at);
        $this->assertDatabaseHas('shipments', ['order_id' => $order->id, 'status' => 'delivered']);
    }

    public function test_marking_an_order_out_for_delivery_updates_the_shipment_and_notifies_the_customer(): void
    {
        // FR-9/FR-18 list "out for delivery" as a notification milestone between
        // shipped and delivered — this was previously unreachable because no such
        // order status existed, so OrderNotifier::outForDelivery() was dead code.
        Mail::fake();
        $admin = User::factory()->create(['role' => 'admin']);
        $order = $this->placedOrder();

        $this->actingAs($admin)->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'shipped']);
        $response = $this->actingAs($admin)->patchJson("/api/admin/orders/{$order->id}/status", [
            'status' => 'out_for_delivery',
        ]);

        $response->assertOk();
        $order->refresh();
        $this->assertEquals('out_for_delivery', $order->status);
        $this->assertDatabaseHas('shipments', ['order_id' => $order->id, 'status' => 'out_for_delivery']);
        Mail::assertSent(OrderStatusMail::class, 2);
    }

    public function test_cancelling_a_placed_order_restocks_its_items(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $order = $this->placedOrder();
        $variant = $order->items->first()->variant;
        $stockBefore = $variant->stock_quantity;

        $response = $this->actingAs($admin)->patchJson("/api/admin/orders/{$order->id}/status", [
            'status' => 'cancelled',
        ]);

        $response->assertOk();
        $this->assertEquals('cancelled', $order->fresh()->status);
        $this->assertEquals($stockBefore + 1, $variant->fresh()->stock_quantity);
    }

    public function test_cancelling_an_already_cancelled_order_does_not_double_restock(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $order = $this->placedOrder();
        $variant = $order->items->first()->variant;
        $stockBefore = $variant->stock_quantity;

        $this->actingAs($admin)->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'cancelled']);
        $this->actingAs($admin)->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'cancelled']);

        $this->assertEquals($stockBefore + 1, $variant->fresh()->stock_quantity);
    }

    public function test_cancelling_an_order_releases_its_discount_code_for_reuse(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $order = $this->placedOrder();
        $code = DiscountCode::create([
            'code' => 'SAVE10',
            'type' => 'percentage',
            'value' => 10,
            'is_active' => true,
        ]);
        $order->update(['discount_code_id' => $code->id]);
        DiscountCodeUsage::create([
            'discount_code_id' => $code->id,
            'user_id' => $order->user_id,
            'order_id' => $order->id,
        ]);

        $this->actingAs($admin)->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'cancelled'])
            ->assertOk();

        $this->assertFalse($code->usedBy($order->user_id));
    }

    public function test_refunding_a_paid_order_returns_stock_and_marks_it_cancelled(): void
    {
        $gateway = new FakePaymentGateway;
        $this->app->instance(PaymentGateway::class, $gateway);

        $admin = User::factory()->create(['role' => 'admin']);
        $order = $this->placedOrder();
        $variant = $order->items->first()->variant;
        $stockBefore = $variant->stock_quantity;
        $payment = Payment::create([
            'order_id' => $order->id,
            'provider' => 'stripe',
            'provider_reference' => 'pi_test_123',
            'status' => 'succeeded',
            'amount_pence' => $order->total_pence,
            'currency' => $order->currency,
        ]);

        $response = $this->actingAs($admin)->postJson("/api/admin/orders/{$order->id}/refund");

        $response->assertOk();
        $this->assertEquals('cancelled', $order->fresh()->status);
        $this->assertEquals('refunded', $payment->fresh()->status);
        $this->assertEquals($stockBefore + 1, $variant->fresh()->stock_quantity);
        $this->assertCount(1, $gateway->refundCalls);
        $this->assertEquals('pi_test_123', $gateway->refundCalls[0]['paymentIntentId']);
    }

    public function test_refunding_an_order_with_no_successful_payment_is_rejected(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $order = $this->placedOrder();

        $response = $this->actingAs($admin)->postJson("/api/admin/orders/{$order->id}/refund");

        $response->assertStatus(422);
        $this->assertEquals('placed', $order->fresh()->status);
    }

    public function test_a_failed_gateway_refund_leaves_the_order_untouched(): void
    {
        $gateway = new FakePaymentGateway;
        $gateway->shouldFailRefund = true;
        $this->app->instance(PaymentGateway::class, $gateway);

        $admin = User::factory()->create(['role' => 'admin']);
        $order = $this->placedOrder();
        $variant = $order->items->first()->variant;
        $stockBefore = $variant->stock_quantity;
        Payment::create([
            'order_id' => $order->id,
            'provider' => 'stripe',
            'provider_reference' => 'pi_test_456',
            'status' => 'succeeded',
            'amount_pence' => $order->total_pence,
            'currency' => $order->currency,
        ]);

        $response = $this->actingAs($admin)->postJson("/api/admin/orders/{$order->id}/refund");

        $response->assertStatus(502);
        $this->assertEquals('placed', $order->fresh()->status);
        $this->assertEquals($stockBefore, $variant->fresh()->stock_quantity);
    }

    public function test_admins_can_search_orders_by_order_number_or_customer(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $order = $this->placedOrder();
        $order->update(['order_number' => 'MAI-FINDME-1']);
        $other = $this->placedOrder();
        $other->update(['order_number' => 'MAI-OTHER-2']);

        $response = $this->actingAs($admin)->getJson('/api/admin/orders?search=FINDME');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals($order->id, $response->json('data.0.id'));
    }

    public function test_the_dashboard_reports_revenue_and_low_stock(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->placedOrder();
        ProductVariant::factory()->create(['stock_quantity' => 2, 'low_stock_threshold' => 5]);

        $response = $this->actingAs($admin)->getJson('/api/admin/dashboard');

        $response->assertOk();
        $this->assertEquals(1, $response->json('orders_count'));
        $this->assertEquals(1000, $response->json('revenue_pence'));
        $this->assertCount(1, $response->json('low_stock'));
    }
}
