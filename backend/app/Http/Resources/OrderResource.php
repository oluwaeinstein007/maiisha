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
                'original_unit_price_pence' => $item->original_unit_price_pence,
                'sale_name' => $item->relationLoaded('sale') ? $item->sale?->name : null,
                'quantity' => $item->quantity,
                'line_total_pence' => $item->line_total_pence,
                // Resolved from the variant's live product, not stored on the order
                // item itself — a photo added/changed after the order was placed
                // still shows up, same as product_name/sku/colour are point-in-time
                // snapshots but the image is not.
                'image_url' => optional($item->variant?->product?->imageFor($item->colour))->url(),
            ]),
            'shipment' => $this->whenLoaded('shipment', fn () => $this->shipment ? [
                'courier' => $this->shipment->courier,
                'tracking_number' => $this->shipment->tracking_number,
                'tracking_url' => $this->shipment->tracking_url,
                'status' => $this->shipment->status,
            ] : null),
            'discount_code' => $this->whenLoaded('discountCode', fn () => $this->discountCode ? [
                'code' => $this->discountCode->code,
                'type' => $this->discountCode->type,
                'value' => $this->discountCode->value,
            ] : null),
            'payment' => $this->whenLoaded('payment', fn () => $this->payment ? [
                'provider' => $this->payment->provider,
                'status' => $this->payment->status,
                'amount_pence' => $this->payment->amount_pence,
            ] : null),
        ];
    }
}
