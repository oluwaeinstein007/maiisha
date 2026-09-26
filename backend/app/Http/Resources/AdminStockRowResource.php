<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** One variant as the admin restock views (dashboard card, inventory page) list it. */
class AdminStockRowResource extends JsonResource
{
    /**
     * @return array{variant_id: int, product_id: int, product_name: string, sku: string, size: ?string, colour: ?string, stock_quantity: int, low_stock_threshold: ?int, is_active: bool}
     */
    public function toArray(Request $request): array
    {
        return [
            'variant_id' => $this->id,
            'product_id' => $this->product_id,
            'product_name' => $this->product->name,
            'sku' => $this->sku,
            'size' => $this->size,
            'colour' => $this->colour,
            'stock_quantity' => $this->stock_quantity,
            'low_stock_threshold' => $this->low_stock_threshold,
            'is_active' => $this->is_active,
        ];
    }
}
