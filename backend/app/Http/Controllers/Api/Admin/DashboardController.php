<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\ProductVariant;

class DashboardController extends Controller
{
    private const PAID_STATUSES = [
        Order::STATUS_PLACED,
        Order::STATUS_PROCESSING,
        Order::STATUS_SHIPPED,
        Order::STATUS_DELIVERED,
    ];

    public function index()
    {
        $paidOrders = Order::whereIn('status', self::PAID_STATUSES);

        $lowStockVariants = ProductVariant::query()
            ->with('product')
            ->whereColumn('stock_quantity', '<=', 'low_stock_threshold')
            ->where('stock_quantity', '>', 0)
            ->get();

        $outOfStockCount = ProductVariant::where('stock_quantity', 0)->count();

        return response()->json([
            'orders_count' => (clone $paidOrders)->count(),
            'revenue_pence' => (clone $paidOrders)->sum('total_pence'),
            'pending_payment_count' => Order::where('status', Order::STATUS_PENDING_PAYMENT)->count(),
            'low_stock' => $lowStockVariants->map(fn (ProductVariant $v) => [
                'variant_id' => $v->id,
                'product_name' => $v->product->name,
                'sku' => $v->sku,
                'stock_quantity' => $v->stock_quantity,
            ]),
            'out_of_stock_count' => $outOfStockCount,
            'recent_orders' => (clone $paidOrders)->latest()->limit(5)->with('user')->get()->map(fn (Order $o) => [
                'id' => $o->id,
                'order_number' => $o->order_number,
                'customer' => $o->user->name,
                'total_pence' => $o->total_pence,
                'status' => $o->status,
                'created_at' => $o->created_at,
            ]),
        ]);
    }
}
