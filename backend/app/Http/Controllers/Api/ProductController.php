<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::query()
            ->active()
            ->with(['category', 'images', 'variants']);

        if ($request->filled('category')) {
            $query->whereHas('category', fn ($q) => $q->where('slug', $request->string('category')));
        }

        if ($request->filled('search')) {
            $search = '%'.$request->string('search').'%';
            $query->where(fn ($q) => $q->where('name', 'like', $search)->orWhere('description', 'like', $search));
        }

        if ($request->filled('size')) {
            $query->whereHas('variants', fn ($q) => $q->where('size', 'ilike', $request->string('size')));
        }

        if ($request->filled('colour')) {
            $query->whereHas('variants', fn ($q) => $q->where('colour', 'ilike', $request->string('colour')));
        }

        if ($request->filled('min_price')) {
            $query->where('price_pence', '>=', (int) $request->input('min_price'));
        }

        if ($request->filled('max_price')) {
            $query->where('price_pence', '<=', (int) $request->input('max_price'));
        }

        match ($request->string('sort')->toString()) {
            'price_asc' => $query->orderBy('price_pence'),
            'price_desc' => $query->orderByDesc('price_pence'),
            'best_selling' => $query->withSum('orderItems as units_sold', 'quantity')->orderByDesc('units_sold'),
            default => $query->latest(),
        };

        $products = $query->paginate($request->integer('per_page', 24));

        return ProductResource::collection($products);
    }

    /**
     * Distinct sizes/colours in use by active products, for the storefront's
     * filter dropdowns (FR — pick from real values instead of free text).
     * Scoped to a category when given, so the options shown match what's
     * actually browsable there.
     */
    public function filters(Request $request)
    {
        $productIds = Product::query()
            ->active()
            ->when($request->filled('category'), fn ($q) => $q->whereHas(
                'category',
                fn ($c) => $c->where('slug', $request->string('category')),
            ))
            ->pluck('id');

        $variants = ProductVariant::query()
            ->whereIn('product_id', $productIds)
            ->where('is_active', true)
            ->get(['size', 'colour']);

        return response()->json([
            'sizes' => $variants->pluck('size')->filter()->unique()->sort()->values(),
            'colours' => $variants->pluck('colour')->filter()->unique()->sort()->values(),
        ]);
    }

    public function show(string $slug)
    {
        $product = Product::query()
            ->active()
            ->where('slug', $slug)
            ->with(['category', 'images', 'variants'])
            ->firstOrFail();

        return new ProductResource($product);
    }
}
