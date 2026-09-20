<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'price_pence' => $this->price_pence,
            'is_featured' => $this->is_featured,
            'hide_when_out_of_stock' => $this->hide_when_out_of_stock,
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
            'in_stock' => $this->relationLoaded('variants') ? $this->inStock() : null,
            'min_price_pence' => $this->relationLoaded('variants') && $this->variants->isNotEmpty()
                ? $this->variants->min(fn ($v) => $v->priceInPence())
                : $this->price_pence,
        ];
    }
}
