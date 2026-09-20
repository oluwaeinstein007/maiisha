<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function paidOrder(int $totalPence, \DateTimeInterface $createdAt): Order
    {
        $customer = User::factory()->create();
        $variant = ProductVariant::factory()->create();

        $order = Order::create([
            'order_number' => 'MAI-'.uniqid(),
            'user_id' => $customer->id,
            'address_id' => Address::factory()->for($customer)->create()->id,
            'status' => Order::STATUS_PLACED,
            'subtotal_pence' => $totalPence,
            'vat_pence' => 0,
            'total_pence' => $totalPence,
            'currency' => 'GBP',
        ]);
        $order->items()->create([
            'product_variant_id' => $variant->id,
            'product_name' => 'Test Product',
            'sku' => $variant->sku,
            'unit_price_pence' => $totalPence,
            'quantity' => 1,
            'line_total_pence' => $totalPence,
        ]);

        $order->created_at = $createdAt;
        $order->save();

        return $order;
    }

    public function test_revenue_growth_percent_compares_this_month_to_last_month(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $now = now();

        // Last month: £100. This month: £150 so far — a 50% increase.
        $this->paidOrder(10000, $now->copy()->subMonthNoOverflow());
        $this->paidOrder(15000, $now->copy()->startOfMonth()->addHours(2));

        $response = $this->actingAs($admin)->getJson('/api/admin/dashboard');

        $response->assertOk();
        $this->assertEquals(50.0, $response->json('revenue_growth_percent'));
    }

    public function test_revenue_growth_percent_is_null_with_no_prior_month_baseline(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->paidOrder(5000, now());

        $response = $this->actingAs($admin)->getJson('/api/admin/dashboard');

        $response->assertOk();
        $this->assertNull($response->json('revenue_growth_percent'));
    }

    public function test_daily_revenue_is_zero_filled_and_sums_same_day_orders(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $today = now()->startOfDay()->addHours(9);

        $this->paidOrder(1000, $today);
        $this->paidOrder(2000, $today->copy()->addHours(3));
        // Well outside the 14-day window, must not be counted.
        $this->paidOrder(99999, now()->subDays(30));

        $response = $this->actingAs($admin)->getJson('/api/admin/dashboard');

        $response->assertOk();
        $daily = collect($response->json('daily_revenue'));

        $this->assertCount(14, $daily);
        $this->assertEquals(
            3000,
            $daily->firstWhere('date', $today->toDateString())['revenue_pence']
        );
        $this->assertEquals($today->toDateString(), $daily->last()['date'], 'the window should end today');
    }
}
