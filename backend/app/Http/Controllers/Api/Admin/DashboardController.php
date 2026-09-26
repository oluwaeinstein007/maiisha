<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminStockRowResource;
use App\Models\Order;
use App\Models\ProductVariant;

class DashboardController extends Controller
{
    public function index()
    {
        $paidOrders = $this->paidOrdersQuery();

        $lowStock = ProductVariant::query()
            ->where('stock_quantity', '>', 0)
            ->whereColumn('stock_quantity', '<=', 'low_stock_threshold');

        // The dashboard shows only the most urgent few; the counts are the true totals
        // and the full list lives on the inventory page.
        $lowStockVariants = (clone $lowStock)->with('product')->orderBy('stock_quantity')->orderBy('id')->limit(20)->get();

        $outOfStockVariants = ProductVariant::query()
            ->with('product')
            ->where('stock_quantity', 0)
            ->orderBy('id')
            ->limit(20)
            ->get();

        $outOfStockCount = ProductVariant::where('stock_quantity', 0)->count();

        return response()->json([
            'orders_count' => (clone $paidOrders)->count(),
            'revenue_pence' => (clone $paidOrders)->sum('total_pence'),
            'pending_payment_count' => Order::where('status', Order::STATUS_PENDING_PAYMENT)->count(),
            'low_stock' => AdminStockRowResource::collection($lowStockVariants)->resolve(),
            'low_stock_count' => $lowStock->count(),
            'out_of_stock' => AdminStockRowResource::collection($outOfStockVariants)->resolve(),
            'out_of_stock_count' => $outOfStockCount,
            'recent_orders' => (clone $paidOrders)->latest()->limit(5)->with('user')->get()->map(fn (Order $o) => [
                'id' => $o->id,
                'order_number' => $o->order_number,
                'customer' => $o->user->name,
                'total_pence' => $o->total_pence,
                'status' => $o->status,
                'created_at' => $o->created_at,
            ]),
            'revenue_growth_percent' => $this->revenueGrowthPercent(),
            'daily_revenue' => $this->dailyRevenue(14),
        ]);
    }

    /**
     * This calendar month's paid revenue vs last calendar month's, as a %
     * change (FR-29). Null rather than 0/100 when there's no prior-month
     * revenue to compare against — a founder's first month shouldn't be
     * reported as "+infinite%" or misleadingly flat.
     */
    private function revenueGrowthPercent(): ?float
    {
        $now = now();
        $lastMonth = $now->copy()->subMonthNoOverflow();

        $thisMonthRevenue = $this->paidOrdersQuery()
            ->whereYear('created_at', $now->year)
            ->whereMonth('created_at', $now->month)
            ->sum('total_pence');

        $lastMonthRevenue = $this->paidOrdersQuery()
            ->whereYear('created_at', $lastMonth->year)
            ->whereMonth('created_at', $lastMonth->month)
            ->sum('total_pence');

        if ($lastMonthRevenue === 0) {
            return null;
        }

        return round((($thisMonthRevenue - $lastMonthRevenue) / $lastMonthRevenue) * 100, 1);
    }

    /**
     * Paid revenue per day for the last $days days, zero-filled so gaps
     * (no orders that day) render as a flat line/bar rather than being
     * skipped — grouped in PHP rather than a DB date-truncation function so
     * this behaves the same on SQLite (tests) and Postgres (production).
     *
     * @return array<int, array{date: string, revenue_pence: int}>
     */
    private function dailyRevenue(int $days): array
    {
        $since = now()->subDays($days - 1)->startOfDay();

        $ordersByDate = $this->paidOrdersQuery()
            ->where('created_at', '>=', $since)
            ->get(['created_at', 'total_pence'])
            ->groupBy(fn (Order $o) => $o->created_at->toDateString());

        return collect(range(0, $days - 1))
            ->map(function (int $offset) use ($since, $ordersByDate) {
                $date = $since->copy()->addDays($offset)->toDateString();

                return [
                    'date' => $date,
                    'revenue_pence' => (int) ($ordersByDate->get($date)?->sum('total_pence') ?? 0),
                ];
            })
            ->values()
            ->all();
    }

    private function paidOrdersQuery()
    {
        return Order::whereIn('status', Order::PAID_STATUSES);
    }
}
