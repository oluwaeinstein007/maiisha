<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\Sale;
use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The admin notification bell: a feed synthesised from real state (orders, stock,
 * sales) rather than a stored notifications table — there's nothing to get out of
 * sync, and it's exactly as current as the data it summarises. "Unread" is tracked
 * as a single per-admin cursor (users.notifications_read_at, see markRead()), not a
 * read flag per item, so it stays correct even as new events appear ahead of old ones.
 */
class NotificationController extends Controller
{
    private const MAX_ITEMS = 30;

    private const STALE_PENDING_PAYMENT_HOURS = 2;

    public function index(Request $request): JsonResponse
    {
        $readAt = $request->user()->notifications_read_at;

        $items = collect([
            ...$this->newOrders(),
            ...$this->stockAlerts(),
            ...$this->staleCheckouts(),
            ...$this->salesEndingSoon(),
        ])
            ->map(fn (array $item) => [
                ...$item,
                // A sale ending soon is a standing heads-up, not a one-off event — it
                // never counts toward the unread badge, or the bell would nag every
                // day a sale happens to be active near its end.
                'unread' => $item['countable'] && ($readAt === null || $item['at']->gt($readAt)),
            ])
            ->sortByDesc(fn (array $item) => $item['at'])
            ->take(self::MAX_ITEMS)
            ->values()
            ->map(fn (array $item) => [
                'id' => $item['id'],
                'type' => $item['type'],
                'title' => $item['title'],
                'message' => $item['message'],
                'link' => $item['link'],
                'created_at' => $item['at']->toIso8601String(),
                'unread' => $item['unread'],
            ]);

        return response()->json([
            'notifications' => $items,
            'unread_count' => $items->filter(fn (array $item) => $item['unread'])->count(),
            'read_at' => $readAt?->toIso8601String(),
        ]);
    }

    /** Everything up to now is read — simpler and safer than tracking per-item state, and matches "open the bell, it's all read" UX. */
    public function markRead(Request $request): JsonResponse
    {
        $request->user()->update(['notifications_read_at' => now()]);

        return response()->json(['read_at' => now()->toIso8601String()]);
    }

    /** @return list<array{id: string, type: string, title: string, message: string, link: string, at: CarbonInterface, countable: bool}> */
    private function newOrders(): array
    {
        return Order::query()
            ->whereIn('status', Order::PAID_STATUSES)
            ->with('user:id,name')
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (Order $order) => [
                'id' => "order-{$order->id}",
                'type' => 'order',
                'title' => 'New order',
                'message' => "{$order->order_number} from {$order->user->name}",
                'link' => "/admin/orders/{$order->id}",
                'at' => $order->created_at,
                'countable' => true,
            ])
            ->all();
    }

    /** @return list<array{id: string, type: string, title: string, message: string, link: string, at: CarbonInterface, countable: bool}> */
    private function stockAlerts(): array
    {
        return ProductVariant::query()
            ->with('product:id,name')
            ->whereColumn('stock_quantity', '<=', 'low_stock_threshold')
            ->orderByDesc('updated_at')
            ->limit(15)
            ->get()
            ->map(function (ProductVariant $variant) {
                $outOfStock = $variant->stock_quantity <= 0;

                return [
                    'id' => 'stock-'.$variant->id,
                    'type' => $outOfStock ? 'out_of_stock' : 'low_stock',
                    'title' => $outOfStock ? 'Out of stock' : 'Running low',
                    'message' => $outOfStock
                        ? "{$variant->product->name} ({$variant->sku}) has sold out"
                        : "{$variant->product->name} ({$variant->sku}) — {$variant->stock_quantity} left",
                    'link' => "/admin/products/{$variant->product_id}",
                    // Variants don't record when they crossed the threshold, so the last
                    // stock change (updated_at) stands in for "when this became a concern".
                    'at' => $variant->updated_at,
                    'countable' => true,
                ];
            })
            ->values()
            ->all();
    }

    /** Checkouts started but never paid — likely abandoned, and easy to miss among paid orders. */
    private function staleCheckouts(): array
    {
        return Order::query()
            ->where('status', Order::STATUS_PENDING_PAYMENT)
            ->where('created_at', '<=', now()->subHours(self::STALE_PENDING_PAYMENT_HOURS))
            ->with('user:id,name')
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (Order $order) => [
                'id' => "stale-{$order->id}",
                'type' => 'stale_checkout',
                'title' => 'Payment never completed',
                'message' => "{$order->order_number} from {$order->user->name} — started ".$order->created_at->diffForHumans(),
                'link' => '/admin/orders?status=pending_payment',
                'at' => $order->created_at,
                'countable' => true,
            ])
            ->all();
    }

    /** A live sale ending within a day — a nudge to extend it or let it lapse on purpose, not an alert. */
    private function salesEndingSoon(): array
    {
        return Sale::query()
            ->where('is_active', true)
            ->whereNotNull('ends_at')
            ->whereBetween('ends_at', [now(), now()->addDay()])
            ->get()
            ->filter(fn (Sale $sale) => $sale->isLiveAt(now()))
            ->map(fn (Sale $sale) => [
                'id' => "sale-{$sale->id}",
                'type' => 'sale',
                'title' => 'Sale ending soon',
                'message' => "{$sale->name} ends ".$sale->ends_at->diffForHumans(),
                'link' => "/admin/sales/{$sale->id}",
                'at' => $sale->ends_at,
                'countable' => false,
            ])
            ->values()
            ->all();
    }
}
