<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $quote = $this->cheapestQuote();
        $sale = $quote['sale'];

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'price_pence' => $this->price_pence,
            'is_featured' => $this->is_featured,
            'hide_when_out_of_stock' => $this->hide_when_out_of_stock,
            'brand_id' => $this->brand_id,
            // Only a live brand is shown to shoppers; an inactive one is a display switch (see the brands migration).
            'brand' => $this->relationLoaded('brand') && $this->brand?->is_active ? [
                'id' => $this->brand->id,
                'name' => $this->brand->name,
                'slug' => $this->brand->slug,
            ] : null,
            'category' => [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
            ],
            'images' => $this->images->map(fn ($image) => [
                'id' => $image->id,
                'url' => $image->url(),
                'alt_text' => $image->alt_text,
                'colour' => $image->colour,
            ]),
            'variants' => ProductVariantResource::collection($this->whenLoaded('variants')),
            'rating_avg' => $this->whenAggregated('reviews', 'rating', 'avg', fn ($v) => $v === null ? null : round((float) $v, 1)),
            'rating_count' => $this->whenCounted('reviews'),
            'in_stock' => $this->relationLoaded('variants') ? $this->inStock() : null,
            // What the shopper pays ("from £x"), with any live sale already applied.
            'min_price_pence' => $quote['price'],
            // The pre-sale price of that same variant, shown struck through; null when not on sale.
            'compare_at_price_pence' => $sale ? $quote['original'] : null,
            'sale' => $sale ? [
                'id' => $sale->id,
                'name' => $sale->name,
                'label' => $sale->discountLabel(),
                'discount_percent' => $quote['original'] > 0
                    ? (int) round(($quote['original'] - $quote['price']) / $quote['original'] * 100)
                    : 0,
                'ends_at' => $sale->ends_at,
            ] : null,
        ];
    }
}
