<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function paidOrder(?User $customer = null, ?\DateTimeInterface $createdAt = null): Order
    {
        $customer ??= User::factory()->create(['name' => 'Ada Lovelace']);

        $order = Order::create([
            'order_number' => 'MAI-'.uniqid(),
            'user_id' => $customer->id,
            'address_id' => Address::factory()->for($customer)->create()->id,
            'status' => Order::STATUS_PLACED,
            'subtotal_pence' => 1000,
            'vat_pence' => 167,
            'total_pence' => 1000,
            'currency' => 'GBP',
        ]);

        if ($createdAt) {
            $order->forceFill(['created_at' => $createdAt])->save();
        }

        return $order;
    }

    public function test_guests_and_customers_cannot_see_notifications(): void
    {
        $this->getJson('/api/admin/notifications')->assertUnauthorized();

        $customer = User::factory()->create(['role' => 'customer']);
        $this->actingAs($customer)->getJson('/api/admin/notifications')->assertForbidden();
    }

    public function test_a_new_paid_order_appears_as_an_unread_notification(): void
    {
        $admin = $this->admin();
        $order = $this->paidOrder();

        $response = $this->actingAs($admin)->getJson('/api/admin/notifications')->assertOk();

        $item = collect($response->json('notifications'))->firstWhere('id', "order-{$order->id}");
        $this->assertNotNull($item);
        $this->assertSame('order', $item['type']);
        $this->assertStringContainsString($order->order_number, $item['message']);
        $this->assertStringContainsString('Ada Lovelace', $item['message']);
        $this->assertSame("/admin/orders/{$order->id}", $item['link']);
        $this->assertTrue($item['unread']);
        $this->assertSame(1, $response->json('unread_count'));
    }

    public function test_an_unpaid_or_cancelled_order_is_not_a_new_order_notification(): void
    {
        $admin = $this->admin();
        $this->paidOrder()->update(['status' => Order::STATUS_PENDING_PAYMENT]);
        $cancelled = $this->paidOrder();
        $cancelled->update(['status' => Order::STATUS_CANCELLED]);

        $response = $this->actingAs($admin)->getJson('/api/admin/notifications')->assertOk();

        $ids = collect($response->json('notifications'))->pluck('id');
        $this->assertFalse($ids->contains(fn ($id) => str_starts_with($id, 'order-')));
    }

    public function test_low_stock_and_out_of_stock_variants_are_reported_with_the_right_severity(): void
    {
        $admin = $this->admin();
        $product = Product::factory()->create(['name' => 'Silky Clip-In Extensions']);
        $low = ProductVariant::factory()->for($product)->create(['sku' => 'LOW-1', 'stock_quantity' => 2, 'low_stock_threshold' => 5]);
        $out = ProductVariant::factory()->for($product)->create(['sku' => 'OUT-1', 'stock_quantity' => 0, 'low_stock_threshold' => 5]);
        ProductVariant::factory()->for($product)->create(['sku' => 'FINE-1', 'stock_quantity' => 20, 'low_stock_threshold' => 5]);

        $response = $this->actingAs($admin)->getJson('/api/admin/notifications')->assertOk();
        $byId = collect($response->json('notifications'))->keyBy('id');

        $this->assertSame('low_stock', $byId["stock-{$low->id}"]['type']);
        $this->assertStringContainsString('2 left', $byId["stock-{$low->id}"]['message']);
        $this->assertSame('out_of_stock', $byId["stock-{$out->id}"]['type']);
        $this->assertSame("/admin/products/{$product->id}", $byId["stock-{$out->id}"]['link']);
        $this->assertArrayNotHasKey('stock-'.($product->variants()->where('sku', 'FINE-1')->first()->id), $byId->all());
    }

    public function test_a_checkout_stuck_pending_payment_for_a_while_is_flagged(): void
    {
        $admin = $this->admin();
        $stale = $this->paidOrder(createdAt: now()->subHours(3));
        $stale->update(['status' => Order::STATUS_PENDING_PAYMENT]);
        $fresh = $this->paidOrder(createdAt: now()->subMinutes(5));
        $fresh->update(['status' => Order::STATUS_PENDING_PAYMENT]);

        $response = $this->actingAs($admin)->getJson('/api/admin/notifications')->assertOk();
        $ids = collect($response->json('notifications'))->pluck('id');

        $this->assertTrue($ids->contains("stale-{$stale->id}"));
        $this->assertFalse($ids->contains("stale-{$fresh->id}"), 'too recent to call abandoned yet');
    }

    public function test_a_sale_ending_within_a_day_is_shown_but_never_counts_as_unread(): void
    {
        $admin = $this->admin();
        Sale::factory()->create(['name' => 'Flash Sale', 'ends_at' => now()->addHours(5)]);
        Sale::factory()->create(['name' => 'Later Sale', 'ends_at' => now()->addDays(10)]);

        $response = $this->actingAs($admin)->getJson('/api/admin/notifications')->assertOk();
        $items = collect($response->json('notifications'));

        $flash = $items->firstWhere('title', 'Sale ending soon');
        $this->assertNotNull($flash);
        $this->assertStringContainsString('Flash Sale', $flash['message']);
        $this->assertFalse($flash['unread'], 'a standing heads-up, not a discrete event');
        $this->assertSame(0, $response->json('unread_count'));
        $this->assertFalse($items->contains('title', 'Later Sale'));
    }

    public function test_marking_read_clears_the_unread_count_but_keeps_the_items_listed(): void
    {
        $admin = $this->admin();
        $order = $this->paidOrder();

        $before = $this->actingAs($admin)->getJson('/api/admin/notifications')->assertOk();
        $this->assertSame(1, $before->json('unread_count'));

        $this->actingAs($admin)->postJson('/api/admin/notifications/read')->assertOk();

        $after = $this->actingAs($admin)->getJson('/api/admin/notifications')->assertOk();
        $this->assertSame(0, $after->json('unread_count'));
        $item = collect($after->json('notifications'))->firstWhere('id', "order-{$order->id}");
        $this->assertFalse($item['unread']);
    }

    public function test_a_new_notification_after_reading_is_unread_again(): void
    {
        $admin = $this->admin();

        // Both notifications_read_at and an order's created_at are second-precision
        // timestamps, so two "now()"s back to back can land in the same second and
        // make "after the read cursor" ambiguous — travel a whole minute between
        // them so the ordering this test is about is never in question.
        $this->travelTo(now());
        $first = $this->paidOrder();
        $this->actingAs($admin)->postJson('/api/admin/notifications/read')->assertOk();

        $this->travelTo(now()->addMinute());
        $second = $this->paidOrder();

        $response = $this->actingAs($admin)->getJson('/api/admin/notifications')->assertOk();
        $this->assertSame(1, $response->json('unread_count'));
        $items = collect($response->json('notifications'))->keyBy('id');
        $this->assertTrue($items["order-{$second->id}"]['unread']);
        $this->assertFalse($items["order-{$first->id}"]['unread']);
    }
}
