<?php

namespace App\Services;

use App\Contracts\ShippingProvider;
use App\Models\Order;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Stand-in until a courier aggregator contract is signed (PRD §9). Logs
 * instead of calling a real API, and returns a fake-but-realistic tracking
 * reference so the order/shipment flow can be built and tested end-to-end now.
 */
class LogShippingProvider implements ShippingProvider
{
    public function createShipment(Order $order): array
    {
        $tracking = 'MAI'.strtoupper(Str::random(10));

        Log::info("Shipment created for order {$order->order_number}", [
            'order_id' => $order->id,
            'tracking_number' => $tracking,
        ]);

        return [
            'courier' => 'royal_mail',
            'tracking_number' => $tracking,
            'tracking_url' => "https://track.example.com/{$tracking}",
        ];
    }
}
