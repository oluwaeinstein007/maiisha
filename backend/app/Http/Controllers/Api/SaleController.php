<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Services\SalePricing;
use Illuminate\Http\JsonResponse;

class SaleController extends Controller
{
    /**
     * The sales running right now, for the storefront's announcement banner and
     * sale page. Only what a shopper needs — never the admin-side fields.
     */
    public function active(SalePricing $pricing): JsonResponse
    {
        $ids = $pricing->liveSales()->pluck('id');

        $sales = Sale::query()
            ->whereIn('id', $ids)
            ->with(['categories:id,name,slug', 'brands:id,name,slug'])
            ->withCount('products')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $sales->map(fn (Sale $sale) => [
                'id' => $sale->id,
                'name' => $sale->name,
                'description' => $sale->description,
                'label' => $sale->discountLabel(),
                'applies_to' => $sale->applies_to,
                // What it covers, for the sale page: lines and brands by name, plus a count of hand-picked products.
                'categories' => $sale->categories->map->only(['name', 'slug'])->values(),
                'brands' => $sale->brands->map->only(['name', 'slug'])->values(),
                'products_count' => $sale->products_count,
                'ends_at' => $sale->ends_at,
                'weekdays' => $sale->active_weekdays,
            ])->values(),
        ]);
    }
}
