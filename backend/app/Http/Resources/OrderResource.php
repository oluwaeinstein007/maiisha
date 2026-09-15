<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'status' => $this->status,
            'subtotal_pence' => $this->subtotal_pence,
            'discount_pence' => $this->discount_pence,
            'vat_pence' => $this->vat_pence,
            'shipping_pence' => $this->shipping_pence,
            'total_pence' => $this->total_pence,
            'currency' => $this->currency,
            'created_at' => $this->created_at,
            'shipped_at' => $this->shipped_at,
            'delivered_at' => $this->delivered_at,
            'customer' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),
            'address' => new AddressResource($this->whenLoaded('address')),
            'items' => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'product_name' => $item->product_name,
                'sku' => $item->sku,
                'size' => $item->size,
                'colour' => $item->colour,
                'unit_price_pence' => $item->unit_price_pence,
                'quantity' => $item->quantity,
                'line_total_pence' => $item->line_total_pence,
            ]),
            'shipment' => $this->whenLoaded('shipment', fn () => $this->shipment ? [
                'courier' => $this->shipment->courier,
                'tracking_number' => $this->shipment->tracking_number,
                'tracking_url' => $this->shipment->tracking_url,
                'status' => $this->shipment->status,
            ] : null),
        ];
    }
}
