<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Category;
use App\Models\DiscountCode;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AdminAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);

        // Saturday 20 Jun 2026, 13:00 in the UK (BST): the shop's "today" is 2026-06-20.
        $this->travelTo(Carbon::parse('2026-06-20 12:00:00', 'UTC'));
    }

    /**
     * @param  list<array{name?: string, unit?: int, qty?: int, original?: int, sale_id?: int, variant?: ProductVariant}>  $lines
     * @param  array<string, mixed>  $attributes
     */
    private function order(int $totalPence, string $at, array $attributes = [], array $lines = [], ?User $customer = null): Order
    {
        $customer ??= User::factory()->create();

        $order = Order::create(array_merge([
            'order_number' => 'MAI-'.uniqid(),
            'user_id' => $customer->id,
            'address_id' => Address::factory()->for($customer)->create()->id,
            'status' => Order::STATUS_PLACED,
            'subtotal_pence' => $totalPence,
            'discount_pence' => 0,
            'shipping_pence' => 0,
            'vat_pence' => 0,
            'total_pence' => $totalPence,
            'currency' => 'GBP',
        ], $attributes));

        foreach ($lines ?: [['name' => 'Test Product', 'unit' => $totalPence]] as $line) {
            $unit = $line['unit'] ?? $totalPence;
            $qty = $line['qty'] ?? 1;

            $order->items()->create([
                'product_variant_id' => isset($line['variant']) ? $line['variant']->id : null,
                'product_name' => $line['name'] ?? 'Test Product',
                'sku' => 'SKU-'.uniqid(),
                'unit_price_pence' => $unit,
                'original_unit_price_pence' => $line['original'] ?? null,
                'sale_id' => $line['sale_id'] ?? null,
                'quantity' => $qty,
                'line_total_pence' => $unit * $qty,
            ]);
        }

        $order->created_at = Carbon::parse($at, 'UTC');
        $order->save();

        return $order;
    }

    private function analytics(string $query = ''): array
    {
        return $this->actingAs($this->admin)->getJson('/api/admin/analytics'.($query ? "?{$query}" : ''))->assertOk()->json();
    }

    private function variantIn(Category $category, string $name): ProductVariant
    {
        $product = Product::factory()->for($category)->create(['name' => $name]);

        return ProductVariant::factory()->for($product)->create();
    }

    public function test_only_admins_can_see_analytics(): void
    {
        auth()->forgetGuards();
        $this->getJson('/api/admin/analytics')->assertUnauthorized();

        $customer = User::factory()->create(['role' => 'customer']);
        $this->actingAs($customer)->getJson('/api/admin/analytics')->assertForbidden();
        $this->actingAs($customer)->getJson('/api/admin/analytics/export')->assertForbidden();
    }

    public function test_kpis_compare_the_range_with_the_previous_period(): void
    {
        // Default range is the last 30 days: 22 May – 20 Jun; the 30 days before that are 22 Apr – 21 May.
        $this->order(10000, '2026-06-15 10:00:00');
        $this->order(5000, '2026-06-10 10:00:00');
        $this->order(10000, '2026-05-10 10:00:00');

        $report = $this->analytics();

        $this->assertSame('2026-05-22', $report['range']['from']);
        $this->assertSame('2026-06-20', $report['range']['to']);
        $this->assertSame('2026-04-22', $report['range']['previous_from']);
        $this->assertSame('2026-05-21', $report['range']['previous_to']);
        $this->assertSame(30, $report['range']['days']);

        $this->assertEquals(['current' => 15000, 'previous' => 10000, 'change_percent' => 50.0], $report['kpis']['revenue_pence']);
        $this->assertEquals(['current' => 2, 'previous' => 1, 'change_percent' => 100.0], $report['kpis']['orders']);
        $this->assertEquals(['current' => 7500, 'previous' => 10000, 'change_percent' => -25.0], $report['kpis']['average_order_value_pence']);
    }

    public function test_change_is_null_when_there_is_nothing_to_compare_against(): void
    {
        $this->order(10000, '2026-06-15 10:00:00');

        $this->assertNull($this->analytics()['kpis']['revenue_pence']['change_percent']);
    }

    public function test_an_empty_shop_reports_zeroes_not_errors(): void
    {
        $report = $this->analytics();

        $this->assertSame(0, $report['kpis']['revenue_pence']['current']);
        $this->assertSame(0, $report['kpis']['average_order_value_pence']['current']);
        $this->assertSame([], $report['top_products']);
        $this->assertSame([], $report['categories']);
        $this->assertCount(30, $report['timeseries']);
        $this->assertSame(0, array_sum(array_column($report['timeseries'], 'revenue_pence')));
    }

    public function test_only_paid_orders_count_as_sales_but_every_status_shows_in_the_breakdown(): void
    {
        $this->order(10000, '2026-06-15 10:00:00');
        $this->order(9999, '2026-06-15 10:00:00', ['status' => Order::STATUS_PENDING_PAYMENT]);
        $this->order(8888, '2026-06-15 10:00:00', ['status' => Order::STATUS_CANCELLED]);
        $this->order(7000, '2026-06-16 10:00:00', ['status' => Order::STATUS_DELIVERED]);

        $report = $this->analytics();

        $this->assertSame(17000, $report['kpis']['revenue_pence']['current']);
        $this->assertSame(2, $report['kpis']['orders']['current']);

        $counts = collect($report['statuses'])->pluck('count', 'status');
        $this->assertSame(1, $counts['pending_payment']);
        $this->assertSame(1, $counts['placed']);
        $this->assertSame(1, $counts['delivered']);
        $this->assertSame(1, $counts['cancelled']);
        $this->assertSame(0, $counts['shipped']);
        $this->assertSame(
            ['pending_payment', 'placed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
            array_column($report['statuses'], 'status'),
        );
    }

    public function test_days_are_shop_days_not_utc_days(): void
    {
        // 23:30 UTC on Mon 15 Jun is 00:30 on Tue 16 Jun in the UK.
        $this->order(4000, '2026-06-15 23:30:00');

        $report = $this->analytics('range=7d');
        $byDate = collect($report['timeseries'])->pluck('revenue_pence', 'date');

        $this->assertSame(4000, $byDate['2026-06-16']);
        $this->assertSame(0, $byDate['2026-06-15']);

        // Tuesday, not Monday.
        $weekdays = collect($report['weekdays'])->pluck('revenue_pence', 'weekday');
        $this->assertSame(4000, $weekdays[2]);
        $this->assertSame(0, $weekdays[1]);
    }

    public function test_the_range_boundary_is_shop_midnight(): void
    {
        // 7d = 14–20 Jun (UK). 22:59 UTC on 13 Jun is 23:59 BST on the 13th — just outside;
        // 23:00 UTC is 00:00 BST on the 14th — the first instant inside.
        $this->order(1000, '2026-06-13 22:59:00');
        $this->order(2000, '2026-06-13 23:00:00');

        $report = $this->analytics('range=7d');

        $this->assertSame(2000, $report['kpis']['revenue_pence']['current']);
        $this->assertSame(1000, $report['kpis']['revenue_pence']['previous']);
    }

    public function test_timeseries_is_zero_filled_and_lined_up_with_the_previous_period(): void
    {
        $this->order(3000, '2026-06-20 09:00:00');   // today
        $this->order(1000, '2026-06-13 09:00:00');   // one week earlier — the same slot in the previous 7d

        $report = $this->analytics('range=7d');
        $series = $report['timeseries'];

        $this->assertCount(7, $series);
        $this->assertSame('2026-06-14', $series[0]['date']);
        $this->assertSame('2026-06-20', $series[6]['date']);
        $this->assertSame(3000, $series[6]['revenue_pence']);
        $this->assertSame(1, $series[6]['orders']);
        $this->assertSame(0, $series[3]['revenue_pence']);
        $this->assertSame(0, $series[3]['orders']);

        // Previous period is 7–13 Jun; its last day lines up with today's slot.
        $this->assertSame(1000, $series[6]['previous_revenue_pence']);
        $this->assertSame(0, $series[0]['previous_revenue_pence']);
    }

    public function test_longer_ranges_are_grouped_by_week_then_month(): void
    {
        $this->order(1000, '2026-06-16 09:00:00');

        $ninety = $this->analytics('range=90d');
        $this->assertSame('week', $ninety['range']['granularity']);
        $this->assertCount(13, $ninety['timeseries']);
        $this->assertSame('2026-03-23', $ninety['timeseries'][0]['date']);
        $this->assertSame('2026-06-15', $ninety['timeseries'][12]['date'], 'weeks start on Monday');
        $this->assertSame(1000, $ninety['timeseries'][12]['revenue_pence']);

        $year = $this->analytics('range=12m');
        $this->assertSame('month', $year['range']['granularity']);
        $this->assertCount(12, $year['timeseries']);
        $this->assertSame('2025-07-01', $year['timeseries'][0]['date']);
        $this->assertSame('2026-06-01', $year['timeseries'][11]['date']);
        $this->assertSame(1000, $year['timeseries'][11]['revenue_pence']);
    }

    public function test_year_to_date_starts_on_the_first_of_january(): void
    {
        $this->assertSame('2026-01-01', $this->analytics('range=ytd')['range']['from']);
    }

    public function test_a_custom_range_is_honoured_and_clamped_to_today(): void
    {
        $this->order(1000, '2026-06-02 09:00:00');
        $this->order(2000, '2026-06-05 09:00:00');

        $report = $this->analytics('range=custom&from=2026-06-01&to=2026-06-03');
        $this->assertSame(1000, $report['kpis']['revenue_pence']['current']);
        $this->assertSame(3, $report['range']['days']);

        $future = $this->analytics('range=custom&from=2026-06-01&to=2030-01-01');
        $this->assertSame('2026-06-20', $future['range']['to']);
    }

    public function test_custom_range_is_validated(): void
    {
        $get = fn (string $q) => $this->actingAs($this->admin)->getJson("/api/admin/analytics?{$q}");

        $get('range=custom')->assertJsonValidationErrors(['from', 'to']);
        $get('range=custom&from=2026-06-10&to=2026-06-01')->assertJsonValidationErrors('to');
        $get('range=custom&from=2020-01-01&to=2026-06-01')->assertJsonValidationErrors('to');
        $get('range=custom&from=nope&to=2026-06-01')->assertJsonValidationErrors('from');
        $get('range=fortnight')->assertJsonValidationErrors('range');
    }

    public function test_customers_are_split_into_new_and_returning(): void
    {
        $returning = User::factory()->create();
        $newcomer = User::factory()->create();

        $this->order(1000, '2026-05-01 09:00:00', customer: $returning);   // bought before the range
        $this->order(2000, '2026-06-18 09:00:00', customer: $returning);
        $this->order(3000, '2026-06-18 10:00:00', customer: $newcomer);
        $this->order(500, '2026-06-19 10:00:00', customer: $newcomer);

        $report = $this->analytics('range=7d');

        $this->assertSame(['new' => 1, 'returning' => 1], $report['customers']);
        $this->assertSame(1, $report['kpis']['new_customers']['current']);
    }

    public function test_signups_count_new_customer_accounts_in_the_range(): void
    {
        User::factory()->create(['created_at' => '2026-06-18 10:00:00']);
        User::factory()->create(['created_at' => '2026-06-19 10:00:00']);
        User::factory()->create(['created_at' => '2026-06-01 10:00:00']);
        User::factory()->create(['role' => 'admin', 'created_at' => '2026-06-18 10:00:00']);

        $this->assertSame(2, $this->analytics('range=7d')['kpis']['signups']['current']);
    }

    public function test_top_products_and_categories_roll_subcategories_into_their_parent(): void
    {
        $women = Category::factory()->create(['name' => 'Womens']);
        $dresses = Category::factory()->create(['name' => 'Dresses', 'parent_id' => $women->id]);
        $shoes = Category::factory()->create(['name' => 'Shoes']);

        $maxi = $this->variantIn($dresses, 'Maxi');
        $boot = $this->variantIn($shoes, 'Boot');
        $top = $this->variantIn($women, 'Top');

        $this->order(9000, '2026-06-15 09:00:00', lines: [
            ['name' => 'Maxi', 'unit' => 4000, 'qty' => 2, 'variant' => $maxi],
            ['name' => 'Boot', 'unit' => 3000, 'variant' => $boot],
            ['name' => 'Top', 'unit' => 1000, 'variant' => $top],
        ]);
        // Cancelled orders don't sell anything.
        $this->order(5000, '2026-06-15 09:00:00', ['status' => Order::STATUS_CANCELLED], [['name' => 'Boot', 'unit' => 5000, 'variant' => $boot]]);

        $report = $this->analytics();

        $this->assertSame(['Maxi', 'Boot', 'Top'], array_column($report['top_products'], 'name'));
        $this->assertSame(8000, $report['top_products'][0]['revenue_pence']);
        $this->assertSame(2, $report['top_products'][0]['units']);
        $this->assertSame($maxi->product_id, $report['top_products'][0]['product_id']);

        $this->assertSame(
            [['name' => 'Womens', 'units' => 3, 'revenue_pence' => 9000], ['name' => 'Shoes', 'units' => 1, 'revenue_pence' => 3000]],
            $report['categories'],
        );
    }

    public function test_lines_whose_product_was_deleted_still_count_under_other(): void
    {
        $this->order(2500, '2026-06-15 09:00:00', lines: [['name' => 'Discontinued', 'unit' => 2500]]);

        $report = $this->analytics();

        $this->assertSame(['Discontinued'], array_column($report['top_products'], 'name'));
        $this->assertNull($report['top_products'][0]['product_id']);
        $this->assertSame([['name' => 'Other', 'units' => 1, 'revenue_pence' => 2500]], $report['categories']);
    }

    public function test_sale_performance_and_the_money_breakdown_reconcile(): void
    {
        $sale = Sale::factory()->create(['name' => 'Christmas Sale']);

        // Two units bought at £80 instead of £100 during the sale, and one full-price £30 item.
        $this->order(19000, '2026-06-15 09:00:00', [
            'subtotal_pence' => 19000, 'discount_pence' => 0, 'shipping_pence' => 0, 'vat_pence' => 3167,
        ], [
            ['name' => 'Dress', 'unit' => 8000, 'qty' => 2, 'original' => 10000, 'sale_id' => $sale->id],
            ['name' => 'Scarf', 'unit' => 3000],
        ]);

        $report = $this->analytics();

        $this->assertSame([[
            'id' => $sale->id, 'name' => 'Christmas Sale', 'orders' => 1, 'units' => 2,
            'revenue_pence' => 16000, 'savings_pence' => 4000,
        ]], $report['sales']);

        $money = $report['money'];
        $this->assertSame(23000, $money['list_price_pence']);
        $this->assertSame(4000, $money['sale_savings_pence']);
        $this->assertSame(3167, $money['vat_pence']);
        // list price − sale savings = what the lines sold for = the order subtotal.
        $this->assertSame(19000, $money['list_price_pence'] - $money['sale_savings_pence']);
    }

    public function test_discount_code_performance_lists_uses_and_what_they_cost(): void
    {
        $code = DiscountCode::factory()->create(['code' => 'SAVE10']);

        $this->order(9000, '2026-06-15 09:00:00', ['discount_code_id' => $code->id, 'discount_pence' => 1000]);
        $this->order(4500, '2026-06-16 09:00:00', ['discount_code_id' => $code->id, 'discount_pence' => 500]);
        $this->order(4000, '2026-06-16 09:00:00');

        $report = $this->analytics();

        $this->assertSame([['code' => 'SAVE10', 'uses' => 2, 'discount_pence' => 1500, 'revenue_pence' => 13500]], $report['discount_codes']);
        $this->assertSame(1500, $report['money']['code_discounts_pence']);
    }

    public function test_export_lists_paid_orders_as_csv_in_pounds(): void
    {
        $customer = User::factory()->create(['name' => 'Ada Lovelace', 'email' => 'ada@example.com']);
        $order = $this->order(12345, '2026-06-15 23:30:00', ['vat_pence' => 2058, 'shipping_pence' => 399, 'subtotal_pence' => 11946], customer: $customer);
        $this->order(9999, '2026-06-15 09:00:00', ['status' => Order::STATUS_CANCELLED]);

        $response = $this->actingAs($this->admin)->get('/api/admin/analytics/export?range=30d');

        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('maiisha-orders-2026-05-22-to-2026-06-20.csv', $response->headers->get('Content-Disposition'));

        $rows = array_map('str_getcsv', array_filter(explode("\n", $response->streamedContent())));
        $this->assertCount(2, $rows, 'header + the one paid order; the cancelled one is left out');
        $this->assertSame('Order number', $rows[0][0]);
        $this->assertSame($order->order_number, $rows[1][0]);
        $this->assertSame('2026-06-16 00:30', $rows[1][1], 'dates are shop time');
        $this->assertSame('Ada Lovelace', $rows[1][2]);
        $this->assertSame('119.46', $rows[1][5]);
        $this->assertSame('3.99', $rows[1][8]);
        $this->assertSame('20.58', $rows[1][9]);
        $this->assertSame('123.45', $rows[1][10]);
    }

    public function test_export_neutralises_spreadsheet_formulas_in_customer_names(): void
    {
        $evil = User::factory()->create(['name' => '=HYPERLINK("http://evil.example","click")']);
        $this->order(1000, '2026-06-15 09:00:00', customer: $evil);

        $csv = $this->actingAs($this->admin)->get('/api/admin/analytics/export')->streamedContent();

        $this->assertStringContainsString("'=HYPERLINK", $csv);
        $this->assertStringNotContainsString(',=HYPERLINK', $csv);
        $this->assertStringNotContainsString('"=HYPERLINK', $csv);
    }

    public function test_export_respects_the_range_validation(): void
    {
        $this->actingAs($this->admin)->getJson('/api/admin/analytics/export?range=custom')
            ->assertJsonValidationErrors(['from', 'to']);
    }
}
