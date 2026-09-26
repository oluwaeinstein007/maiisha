<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminStockRowResource;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InventoryController extends Controller
{
    /**
     * Every variant with its stock, most urgent first, for the restock page.
     * "low" and "out" mirror the dashboard's definitions: out is nothing left, low
     * is anything left but at or under the variant's own threshold.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $data = $request->validate([
            'status' => ['nullable', 'in:attention,out,low,all'],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = ProductVariant::query()->with('product');

        match ($data['status'] ?? 'attention') {
            'out' => $query->where('stock_quantity', 0),
            'low' => $query->where('stock_quantity', '>', 0)->whereColumn('stock_quantity', '<=', 'low_stock_threshold'),
            'attention' => $query->whereColumn('stock_quantity', '<=', 'low_stock_threshold'),
            'all' => null,
        };

        if (filled($data['search'] ?? null)) {
            $term = '%'.$data['search'].'%';
            $query->where(fn (Builder $q) => $q
                ->where('sku', 'like', $term)
                ->orWhereHas('product', fn (Builder $p) => $p->where('name', 'like', $term)));
        }

        $rows = $query->orderBy('stock_quantity')->orderBy('id')->paginate($data['per_page'] ?? 20);

        return AdminStockRowResource::collection($rows)->additional(['counts' => [
            'out' => ProductVariant::where('stock_quantity', 0)->count(),
            'low' => ProductVariant::where('stock_quantity', '>', 0)->whereColumn('stock_quantity', '<=', 'low_stock_threshold')->count(),
            'all' => ProductVariant::count(),
        ]]);
    }
}
