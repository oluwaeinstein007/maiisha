<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
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
            $query->whereHas('variants', fn ($q) => $q->where('size', $request->string('size')));
        }

        if ($request->filled('colour')) {
            $query->whereHas('variants', fn ($q) => $q->where('colour', $request->string('colour')));
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
