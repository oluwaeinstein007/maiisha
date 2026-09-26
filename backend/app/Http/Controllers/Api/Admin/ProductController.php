<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::query()->with(['category', 'brand', 'images', 'variants']);

        if ($request->filled('search')) {
            $query->where('name', 'like', '%'.$request->string('search').'%');
        }

        return ProductResource::collection($query->latest()->paginate($request->integer('per_page', 20)));
    }

    public function show(Product $product)
    {
        return new ProductResource($product->load(['category', 'brand', 'images', 'variants']));
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $data['slug'] = $data['slug'] ?? Str::slug($data['name']);

        $product = Product::create($data);

        return new ProductResource($product->load(['category', 'brand', 'images', 'variants']));
    }

    public function update(Request $request, Product $product)
    {
        $data = $this->validated($request, $product->id);
        $product->update($data);

        return new ProductResource($product->load(['category', 'brand', 'images', 'variants']));
    }

    public function destroy(Product $product)
    {
        // Variants/images cascade-delete at the schema level, which would silently
        // orphan any past order line that points at one of this product's variants
        // (product_variant_id nullOnDelete) — the order keeps its snapshot fields
        // (name/sku/price) but loses its live image and the ability to re-link.
        // Mirrors the category/brand guard: block the hard delete, suggest hiding it.
        $orderCount = OrderItem::whereIn('product_variant_id', $product->variants()->pluck('id'))
            ->distinct('order_id')
            ->count('order_id');

        if ($orderCount > 0) {
            return response()->json([
                'message' => "This product has been ordered before ({$orderCount} order(s)). Deactivate it instead of deleting it, to keep past orders intact.",
            ], 409);
        }

        $product->delete();

        return response()->json(['message' => 'Product deleted.']);
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'category_id' => ['required', 'exists:categories,id'],
            'brand_id' => ['nullable', 'exists:brands,id'],
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:products,slug,'.$ignoreId],
            'description' => ['nullable', 'string'],
            'price_pence' => ['required', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'is_featured' => ['sometimes', 'boolean'],
            'hide_when_out_of_stock' => ['sometimes', 'boolean'],
        ]);
    }
}
