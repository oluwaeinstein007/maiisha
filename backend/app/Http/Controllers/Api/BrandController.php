<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BrandResource;
use App\Models\Brand;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BrandController extends Controller
{
    /** Live brands that have something to buy — a brand with no browsable products would be an empty page. */
    public function index(): AnonymousResourceCollection
    {
        return BrandResource::collection(
            Brand::query()
                ->where('is_active', true)
                ->whereHas('products', fn ($products) => $products->active())
                ->withCount(['products' => fn ($products) => $products->active()])
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
        );
    }

    public function show(string $slug): BrandResource
    {
        $brand = Brand::query()
            ->where('is_active', true)
            ->where('slug', $slug)
            ->withCount(['products' => fn ($products) => $products->active()])
            ->firstOrFail();

        return new BrandResource($brand);
    }
}
