<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Order;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * The numbers behind the admin analytics page (FR-29): how the shop did over a
 * period, set against the period just before it.
 *
 * "Days" are the shop's days (config commerce.timezone), not UTC ones, so an
 * order at 00:30 UK time on Tuesday counts towards Tuesday. Only paid orders
 * count as sales; cancelled and unpaid ones appear in the status breakdown only.
 */
class AnalyticsReport
{
    public const RANGES = ['7d', '30d', '90d', '12m', 'ytd', 'custom'];

    private const STATUS_ORDER = [
        Order::STATUS_PENDING_PAYMENT,
        Order::STATUS_PLACED,
        Order::STATUS_PROCESSING,
        Order::STATUS_SHIPPED,
        Order::STATUS_OUT_FOR_DELIVERY,
        Order::STATUS_DELIVERED,
        Order::STATUS_CANCELLED,
    ];

    private string $timezone;

    private CarbonImmutable $from;

    private CarbonImmutable $to;

    private CarbonImmutable $previousFrom;

    private CarbonImmutable $previousTo;

    private int $days;

    private string $granularity;

    public function __construct(private readonly string $range = '30d', ?string $from = null, ?string $to = null)
    {
        $this->timezone = config('commerce.timezone');
        $today = CarbonImmutable::now($this->timezone)->startOfDay();

        if ($range === 'custom' && $from !== null && $to !== null) {
            $this->from = CarbonImmutable::parse($from, $this->timezone)->startOfDay();
            $this->to = min(CarbonImmutable::parse($to, $this->timezone), $today)->endOfDay();
        } else {
            $this->from = match ($range) {
                '7d' => $today->subDays(6),
                '90d' => $today->subDays(89),
                '12m' => $today->subMonthsNoOverflow(11)->startOfMonth(),
                'ytd' => $today->startOfYear(),
                default => $today->subDays(29),
            };
            $this->to = $today->endOfDay();
        }

        // Whole days, counted on plain dates so a clock change inside the range can't skew it.
        $this->days = (int) round(
            CarbonImmutable::parse($this->from->toDateString(), 'UTC')
                ->diffInDays(CarbonImmutable::parse($this->to->toDateString(), 'UTC'))
        ) + 1;

        $this->previousTo = $this->from->subDay()->endOfDay();
        $this->previousFrom = $this->previousTo->startOfDay()->subDays($this->days - 1);

        $this->granularity = match (true) {
            $this->days <= 62 => 'day',
            $this->days <= 183 => 'week',
            default => 'month',
        };
    }

    /** @return array<string, mixed> */
    public function build(): array
    {
        $orders = $this->paidOrders($this->previousFrom, $this->to);
        $current = $orders->filter(fn (Order $o) => $o->created_at->gte($this->from->utc()))->values();
        $previous = $orders->reject(fn (Order $o) => $o->created_at->gte($this->from->utc()))->values();

        $items = $this->itemTotals($this->from, $this->to);
        $previousItems = $this->itemTotals($this->previousFrom, $this->previousTo);

        $newCustomers = $this->newCustomerCount($current, $this->from);
        $previousNewCustomers = $this->newCustomerCount($previous, $this->previousFrom);

        $revenue = (int) $current->sum('total_pence');
        $previousRevenue = (int) $previous->sum('total_pence');

        return [
            'range' => [
                'key' => $this->range,
                'from' => $this->from->toDateString(),
                'to' => $this->to->toDateString(),
                'days' => $this->days,
                'granularity' => $this->granularity,
                'previous_from' => $this->previousFrom->toDateString(),
                'previous_to' => $this->previousTo->toDateString(),
                'timezone' => $this->timezone,
            ],
            'kpis' => [
                'revenue_pence' => $this->kpi($revenue, $previousRevenue),
                'orders' => $this->kpi($current->count(), $previous->count()),
                'average_order_value_pence' => $this->kpi(
                    $this->average($revenue, $current->count()),
                    $this->average($previousRevenue, $previous->count()),
                ),
                'units_sold' => $this->kpi($items['units'], $previousItems['units']),
                'new_customers' => $this->kpi($newCustomers, $previousNewCustomers),
                'signups' => $this->kpi(
                    $this->signups($this->from, $this->to),
                    $this->signups($this->previousFrom, $this->previousTo),
                ),
            ],
            // Where the money went: list price → what sales and codes took off → what was paid.
            'money' => [
                'list_price_pence' => $items['list_total'],
                'sale_savings_pence' => $items['savings'],
                'code_discounts_pence' => (int) $current->sum('discount_pence'),
                'shipping_pence' => (int) $current->sum('shipping_pence'),
                'vat_pence' => (int) $current->sum('vat_pence'),
                'total_pence' => $revenue,
            ],
            'customers' => [
                'new' => $newCustomers,
                'returning' => max(0, $current->pluck('user_id')->unique()->count() - $newCustomers),
            ],
            'timeseries' => $this->timeseries($current, $previous),
            'weekdays' => $this->weekdays($current),
            'top_products' => $this->topProducts(),
            'categories' => $this->categories(),
            'statuses' => $this->statuses(),
            'sales' => $this->salesPerformance(),
            'discount_codes' => $this->discountCodes(),
        ];
    }

    /**
     * Paid orders in the range as CSV-ready rows (newest first) — for the
     * bookkeeper/VAT return.
     *
     * @return Collection<int, Order>
     */
    public function exportOrders(): Collection
    {
        return Order::query()
            ->whereIn('status', Order::PAID_STATUSES)
            ->whereBetween('created_at', [$this->from->utc(), $this->to->utc()])
            ->with(['user:id,name,email', 'discountCode:id,code'])
            ->withCount(['items as sale_items_count' => fn ($q) => $q->whereNotNull('sale_id')])
            ->latest()
            ->get();
    }

    public function timezone(): string
    {
        return $this->timezone;
    }

    public function from(): CarbonImmutable
    {
        return $this->from;
    }

    public function to(): CarbonImmutable
    {
        return $this->to;
    }

    /** @return Collection<int, Order> */
    private function paidOrders(CarbonInterface $from, CarbonInterface $to): Collection
    {
        return Order::query()
            ->whereIn('status', Order::PAID_STATUSES)
            ->whereBetween('created_at', [$from->utc(), $to->utc()])
            ->get(['id', 'user_id', 'created_at', 'subtotal_pence', 'discount_pence', 'shipping_pence', 'vat_pence', 'total_pence']);
    }

    /** @return array{current: int, previous: int, change_percent: ?float} */
    private function kpi(int $current, int $previous): array
    {
        return [
            'current' => $current,
            'previous' => $previous,
            // Null, not 0 or ∞, when there's nothing to compare against.
            'change_percent' => $previous === 0 ? null : round(($current - $previous) / $previous * 100, 1),
        ];
    }

    private function average(int $total, int $count): int
    {
        return $count === 0 ? 0 : (int) round($total / $count);
    }

    /**
     * Units and list-vs-charged money for paid order lines in a period.
     *
     * @return array{units: int, list_total: int, savings: int}
     */
    private function itemTotals(CarbonInterface $from, CarbonInterface $to): array
    {
        $row = $this->paidItemLines($from, $to)
            ->selectRaw('
                COALESCE(SUM(order_items.quantity), 0) as units,
                COALESCE(SUM(COALESCE(order_items.original_unit_price_pence, order_items.unit_price_pence) * order_items.quantity), 0) as list_total,
                COALESCE(SUM((COALESCE(order_items.original_unit_price_pence, order_items.unit_price_pence) - order_items.unit_price_pence) * order_items.quantity), 0) as savings
            ')
            ->first();

        return ['units' => (int) $row->units, 'list_total' => (int) $row->list_total, 'savings' => (int) $row->savings];
    }

    /** Order lines belonging to paid orders in the period — the base of every product-level figure. */
    private function paidItemLines(CarbonInterface $from, CarbonInterface $to): QueryBuilder
    {
        return DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereIn('orders.status', Order::PAID_STATUSES)
            ->whereBetween('orders.created_at', [$from->utc(), $to->utc()]);
    }

    /**
     * Customers in $orders whose first paid order is inside the period — as
     * opposed to returning ones who had already bought before $periodStart.
     *
     * @param  Collection<int, Order>  $orders
     */
    private function newCustomerCount(Collection $orders, CarbonInterface $periodStart): int
    {
        $customerIds = $orders->pluck('user_id')->unique()->values();

        $returning = $customerIds->chunk(500)->flatMap(fn (Collection $chunk) => Order::query()
            ->whereIn('status', Order::PAID_STATUSES)
            ->whereIn('user_id', $chunk->all())
            ->where('created_at', '<', $periodStart->utc())
            ->distinct()
            ->pluck('user_id'));

        return $customerIds->count() - $returning->unique()->count();
    }

    private function signups(CarbonInterface $from, CarbonInterface $to): int
    {
        return User::query()
            ->where('role', 'customer')
            ->whereBetween('created_at', [$from->utc(), $to->utc()])
            ->count();
    }

    /**
     * Revenue and order counts per day/week/month, zero-filled so quiet
     * stretches show as gaps in the line rather than being skipped, with the
     * previous period's revenue alongside, bucket for bucket.
     *
     * @param  Collection<int, Order>  $current
     * @param  Collection<int, Order>  $previous
     * @return list<array{date: string, revenue_pence: int, orders: int, previous_revenue_pence: ?int}>
     */
    private function timeseries(Collection $current, Collection $previous): array
    {
        $bucketed = fn (Collection $orders) => $orders->groupBy(fn (Order $o) => $this->bucketKey($o->created_at->copy()->setTimezone($this->timezone)));

        $currentByBucket = $bucketed($current);
        $previousByBucket = $bucketed($previous);
        $previousStarts = $this->bucketStarts($this->previousFrom, $this->previousTo);

        return collect($this->bucketStarts($this->from, $this->to))
            ->map(function (string $start, int $index) use ($currentByBucket, $previousByBucket, $previousStarts) {
                $previousStart = $previousStarts[$index] ?? null;

                return [
                    'date' => $start,
                    'revenue_pence' => (int) ($currentByBucket->get($start)?->sum('total_pence') ?? 0),
                    'orders' => $currentByBucket->get($start)?->count() ?? 0,
                    'previous_revenue_pence' => $previousStart === null
                        ? null
                        : (int) ($previousByBucket->get($previousStart)?->sum('total_pence') ?? 0),
                ];
            })
            ->values()
            ->all();
    }

    private function bucketKey(CarbonInterface $local): string
    {
        return match ($this->granularity) {
            'week' => $local->copy()->startOfWeek(CarbonInterface::MONDAY)->toDateString(),
            'month' => $local->copy()->startOfMonth()->toDateString(),
            default => $local->toDateString(),
        };
    }

    /** @return list<string> */
    private function bucketStarts(CarbonImmutable $from, CarbonImmutable $to): array
    {
        [$cursor, $step] = match ($this->granularity) {
            'week' => [$from->startOfWeek(CarbonInterface::MONDAY), '1 week'],
            'month' => [$from->startOfMonth(), '1 month'],
            default => [$from->startOfDay(), '1 day'],
        };

        $starts = [];
        while ($cursor->lte($to)) {
            $starts[] = $cursor->toDateString();
            $cursor = $cursor->modify("+{$step}");
        }

        return $starts;
    }

    /**
     * Takings by day of the week (Monday first) — shows whether a "Monday deal" is pulling its weight.
     *
     * @param  Collection<int, Order>  $current
     * @return list<array{weekday: int, revenue_pence: int, orders: int}>
     */
    private function weekdays(Collection $current): array
    {
        $byWeekday = $current->groupBy(fn (Order $o) => $o->created_at->copy()->setTimezone($this->timezone)->isoWeekday());

        return collect(range(1, 7))->map(fn (int $day) => [
            'weekday' => $day,
            'revenue_pence' => (int) ($byWeekday->get($day)?->sum('total_pence') ?? 0),
            'orders' => $byWeekday->get($day)?->count() ?? 0,
        ])->all();
    }

    /** @return list<array{product_id: ?int, name: string, units: int, revenue_pence: int}> */
    private function topProducts(): array
    {
        return $this->paidItemLines($this->from, $this->to)
            ->leftJoin('product_variants', 'product_variants.id', '=', 'order_items.product_variant_id')
            ->groupBy('order_items.product_name')
            ->selectRaw('order_items.product_name as name, MIN(product_variants.product_id) as product_id, SUM(order_items.quantity) as units, SUM(order_items.line_total_pence) as revenue')
            ->orderByDesc('revenue')
            ->limit(8)
            ->get()
            ->map(fn ($row) => [
                'product_id' => $row->product_id === null ? null : (int) $row->product_id,
                'name' => $row->name,
                'units' => (int) $row->units,
                'revenue_pence' => (int) $row->revenue,
            ])
            ->all();
    }

    /**
     * Revenue by top-level category (Dresses rolls up into Women's fashion),
     * from the product each line was bought as. Lines whose product has since
     * been deleted fall under "Other".
     *
     * @return list<array{name: string, units: int, revenue_pence: int}>
     */
    private function categories(): array
    {
        $rows = $this->paidItemLines($this->from, $this->to)
            ->leftJoin('product_variants', 'product_variants.id', '=', 'order_items.product_variant_id')
            ->leftJoin('products', 'products.id', '=', 'product_variants.product_id')
            ->groupBy('products.category_id')
            ->selectRaw('products.category_id as category_id, SUM(order_items.quantity) as units, SUM(order_items.line_total_pence) as revenue')
            ->get();

        $categories = Category::query()->get(['id', 'parent_id', 'name'])->keyBy('id');
        $topLevelOf = function (?int $id) use ($categories): ?Category {
            $category = $categories->get($id);
            while ($category?->parent_id !== null && $categories->has($category->parent_id)) {
                $category = $categories->get($category->parent_id);
            }

            return $category;
        };

        return $rows
            ->groupBy(fn ($row) => $topLevelOf($row->category_id === null ? null : (int) $row->category_id)?->name ?? 'Other')
            ->map(fn (Collection $group, string $name) => [
                'name' => $name,
                'units' => (int) $group->sum('units'),
                'revenue_pence' => (int) $group->sum('revenue'),
            ])
            ->sortByDesc('revenue_pence')
            ->values()
            ->all();
    }

    /**
     * Every order placed in the period by status, paid or not — the gap between
     * "pending payment" and "placed" is checkouts that were started but never paid.
     *
     * @return list<array{status: string, count: int}>
     */
    private function statuses(): array
    {
        $counts = Order::query()
            ->whereBetween('created_at', [$this->from->utc(), $this->to->utc()])
            ->groupBy('status')
            ->selectRaw('status, COUNT(*) as total')
            ->pluck('total', 'status');

        return collect(self::STATUS_ORDER)
            ->map(fn (string $status) => ['status' => $status, 'count' => (int) ($counts[$status] ?? 0)])
            ->all();
    }

    /**
     * What each sale earned and cost in the period: revenue from its lines, and
     * the money it took off list price.
     *
     * @return list<array{id: int, name: string, orders: int, units: int, revenue_pence: int, savings_pence: int}>
     */
    private function salesPerformance(): array
    {
        return $this->paidItemLines($this->from, $this->to)
            ->join('sales', 'sales.id', '=', 'order_items.sale_id')
            ->groupBy('sales.id', 'sales.name')
            ->selectRaw('
                sales.id as id, sales.name as name,
                COUNT(DISTINCT order_items.order_id) as orders,
                SUM(order_items.quantity) as units,
                SUM(order_items.line_total_pence) as revenue,
                SUM((order_items.original_unit_price_pence - order_items.unit_price_pence) * order_items.quantity) as savings
            ')
            ->orderByDesc('revenue')
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'name' => $row->name,
                'orders' => (int) $row->orders,
                'units' => (int) $row->units,
                'revenue_pence' => (int) $row->revenue,
                'savings_pence' => (int) $row->savings,
            ])
            ->all();
    }

    /** @return list<array{code: string, uses: int, discount_pence: int, revenue_pence: int}> */
    private function discountCodes(): array
    {
        return DB::table('orders')
            ->join('discount_codes', 'discount_codes.id', '=', 'orders.discount_code_id')
            ->whereIn('orders.status', Order::PAID_STATUSES)
            ->whereBetween('orders.created_at', [$this->from->utc(), $this->to->utc()])
            ->groupBy('discount_codes.id', 'discount_codes.code')
            ->selectRaw('discount_codes.code as code, COUNT(*) as uses, SUM(orders.discount_pence) as discount, SUM(orders.total_pence) as revenue')
            ->orderByDesc('uses')
            ->limit(8)
            ->get()
            ->map(fn ($row) => [
                'code' => $row->code,
                'uses' => (int) $row->uses,
                'discount_pence' => (int) $row->discount,
                'revenue_pence' => (int) $row->revenue,
            ])
            ->all();
    }
}
