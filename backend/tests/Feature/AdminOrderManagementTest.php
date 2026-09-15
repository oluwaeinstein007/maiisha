<?php

namespace Tests\Feature;

use App\Mail\OrderStatusMail;
use App\Models\Address;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
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
