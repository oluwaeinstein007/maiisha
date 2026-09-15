<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CartResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'items' => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'quantity' => $item->quantity,
                'unit_price_pence' => $item->variant->priceInPence(),
                'line_total_pence' => $item->quantity * $item->variant->priceInPence(),
                'variant' => [
                    'id' => $item->variant->id,
                    'sku' => $item->variant->sku,
                    'size' => $item->variant->size,
                    'colour' => $item->variant->colour,
                    'stock_quantity' => $item->variant->stock_quantity,
                ],
                'product' => [
                    'id' => $item->variant->product->id,
                    'name' => $item->variant->product->name,
                    'slug' => $item->variant->product->slug,
                    'image_url' => optional($item->variant->product->images->first())->url(),
                ],
            ]),
            'subtotal_pence' => $this->subtotalPence(),
        ];
    }
}
