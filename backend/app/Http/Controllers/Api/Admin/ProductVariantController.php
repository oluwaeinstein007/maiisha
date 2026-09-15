<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductVariantResource;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;

class ProductVariantController extends Controller
{
    public function store(Request $request, Product $product)
    {
        $data = $this->validated($request);
        $variant = $product->variants()->create($data);

        return new ProductVariantResource($variant);
    }

    /** Also the endpoint used for stock adjustments (FR-22) — pass stock_quantity. */
    public function update(Request $request, ProductVariant $variant)
    {
        $data = $this->validated($request, $variant->id);
        $variant->update($data);

        return new ProductVariantResource($variant);
    }

    public function destroy(ProductVariant $variant)
    {
        $variant->delete();

        return response()->json(['message' => 'Variant deleted.']);
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'sku' => ['required', 'string', 'max:100', 'unique:product_variants,sku,'.$ignoreId],
            'size' => ['nullable', 'string', 'max:50'],
            'colour' => ['nullable', 'string', 'max:50'],
            'price_override_pence' => ['nullable', 'integer', 'min:0'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }
}
