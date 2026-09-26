<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    private const WITH = ['category', 'brand', 'images', 'variants'];

    public function index(Request $request)
    {
        $ids = $request->user()->wishlistItems()->latest('id')->pluck('product_id');

        $products = Product::query()->active()
            ->with(self::WITH)->withAvg('reviews', 'rating')->withCount('reviews')
            ->whereIn('products.id', $ids)
            ->get()
            ->sortBy(fn (Product $p) => $ids->search($p->id))
            ->values();

        return ProductResource::collection($products);
    }

    public function store(Request $request)
    {
        $data = $request->validate(['product_id' => ['required', 'integer']]);

        $product = Product::query()->active()->findOrFail($data['product_id']);
        $request->user()->wishlistItems()->firstOrCreate(['product_id' => $product->id]);

        return response()->json(['message' => 'Saved to your wishlist.'], 201);
    }

    public function destroy(Request $request, int $product)
    {
        $request->user()->wishlistItems()->where('product_id', $product)->delete();

        return response()->json(['message' => 'Removed from your wishlist.']);
    }

    /** Products like the ones saved (same categories/brands), excluding what's already saved. */
    public function recommendations(Request $request)
    {
        $saved = Product::query()->whereIn('id', $request->user()->wishlistItems()->select('product_id'))->get();

        if ($saved->isEmpty()) {
            return ProductResource::collection(collect());
        }

        $categoryIds = $saved->pluck('category_id')->unique();
        $brandIds = $saved->pluck('brand_id')->filter()->unique();

        $products = Product::query()->active()
            ->whereNotIn('products.id', $saved->pluck('id'))
            ->where(fn ($q) => $q->whereIn('products.category_id', $categoryIds)->orWhereIn('products.brand_id', $brandIds))
            ->with(self::WITH)
            ->withSum('orderItems as units_sold', 'quantity')
            ->withAvg('reviews', 'rating')->withCount('reviews')
            ->limit(100)
            ->get()
            ->sortByDesc(fn (Product $p) => [
                ($categoryIds->contains($p->category_id) ? 2 : 0) + ($brandIds->contains($p->brand_id) ? 1 : 0),
                (int) $p->units_sold,
                $p->id,
            ])
            ->take(8)
            ->values();

        return ProductResource::collection($products);
    }
}
