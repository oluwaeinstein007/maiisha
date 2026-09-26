<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductVariantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $quote = $this->quote();

        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'size' => $this->size,
            'colour' => $this->colour,
            'price_pence' => $quote['price'],
            'compare_at_price_pence' => $quote['sale'] ? $quote['original'] : null,
            'stock_quantity' => $this->stock_quantity,
            'low_stock_threshold' => $this->low_stock_threshold,
            'in_stock' => $this->isInStock(),
            'low_stock' => $this->isLowStock(),
            'is_active' => $this->is_active,
        ];
    }
}
