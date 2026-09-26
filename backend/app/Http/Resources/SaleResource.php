<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $timezone = config('commerce.timezone');

        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'type' => $this->type,
            'value' => $this->value,
            'discount_label' => $this->discountLabel(),
            'applies_to' => $this->applies_to,
            'category_ids' => $this->whenLoaded('categories', fn () => $this->categories->pluck('id')),
            'brand_ids' => $this->whenLoaded('brands', fn () => $this->brands->pluck('id')),
            'product_ids' => $this->whenLoaded('products', fn () => $this->products->pluck('id')),
            'categories' => $this->whenLoaded('categories', fn () => $this->categories->map->only(['id', 'name'])),
            'brands' => $this->whenLoaded('brands', fn () => $this->brands->map->only(['id', 'name'])),
            'products' => $this->whenLoaded('products', fn () => $this->products->map->only(['id', 'name'])),
            'starts_at' => $this->starts_at,
            'ends_at' => $this->ends_at,
            // The same instants as wall-clock time in the shop's timezone
            // ("2026-12-01T00:00") — what the admin's date-time inputs read and
            // write, so "midnight on 1 Dec" means UK midnight whatever the browser's zone.
            'starts_at_local' => $this->starts_at?->copy()->setTimezone($timezone)->format('Y-m-d\TH:i'),
            'ends_at_local' => $this->ends_at?->copy()->setTimezone($timezone)->format('Y-m-d\TH:i'),
            'active_weekdays' => $this->active_weekdays,
            'is_active' => $this->is_active,
            'status' => $this->status(),
            'created_at' => $this->created_at,
        ];
    }
}
