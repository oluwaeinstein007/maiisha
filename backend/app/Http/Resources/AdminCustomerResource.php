<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminCustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'created_at' => $this->created_at,
            // Paid orders only — a customer's one abandoned checkout shouldn't count
            // as their first "order" in the admin's eyes.
            'orders_count' => (int) $this->orders_count,
            'total_spent_pence' => (int) ($this->total_spent_pence ?? 0),
            'addresses' => AddressResource::collection($this->whenLoaded('addresses')),
        ];
    }
}
