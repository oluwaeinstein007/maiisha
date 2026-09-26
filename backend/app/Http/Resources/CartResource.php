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
            'items' => $this->items->map(function ($item) {
                $quote = $item->variant->quote();

                return [
                    'id' => $item->id,
                    'quantity' => $item->quantity,
                    'unit_price_pence' => $quote['price'],
                    // Normal price while a sale is knocking it down, so the cart can show what's saved.
                    'compare_at_unit_price_pence' => $quote['sale'] ? $quote['original'] : null,
                    'sale_name' => $quote['sale']?->name,
                    'line_total_pence' => $item->quantity * $quote['price'],
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
                        'image_url' => optional($item->variant->product->imageFor($item->variant->colour))->url(),
                    ],
                ];
            }),
            'subtotal_pence' => $this->subtotalPence(),
            'savings_pence' => $this->savingsPence(),
        ];
    }
}
