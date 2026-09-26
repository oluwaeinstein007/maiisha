<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

/** What shoppers are asking for: products saved to wishlists and people waiting for a restock. */
class DemandController extends Controller
{
    public function index(): JsonResponse
    {
        $products = Product::query()
            ->withCount([
                'wishlistItems as wishlist_count',
                'stockAlerts as waiting_count' => fn ($q) => $q->whereNull('notified_at'),
            ])
            ->with('variants:id,product_id,stock_quantity,is_active')
            ->get()
            ->filter(fn (Product $p) => $p->wishlist_count > 0 || $p->waiting_count > 0)
            ->sortByDesc(fn (Product $p) => [$p->waiting_count, $p->wishlist_count])
            ->take(100)
            ->values();

        return response()->json([
            'data' => $products->map(fn (Product $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'wishlist_count' => $p->wishlist_count,
                'waiting_count' => $p->waiting_count,
                'stock' => $p->totalStock(),
            ]),
        ]);
    }
}
