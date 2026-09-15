<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductVariantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'size' => $this->size,
            'colour' => $this->colour,
            'price_pence' => $this->priceInPence(),
            'stock_quantity' => $this->stock_quantity,
            'in_stock' => $this->isInStock(),
            'low_stock' => $this->isLowStock(),
            'is_active' => $this->is_active,
        ];
    }
}
