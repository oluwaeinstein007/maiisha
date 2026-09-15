<?php

namespace App\Contracts;

use App\Models\Order;

/**
 * Abstraction over the multi-courier aggregator (PRD §7.4: Royal Mail, DPD, Evri, DHL).
 * Swapping in a real aggregator later means adding one implementation and
 * rebinding it in a service provider — no callers change.
 */
interface ShippingProvider
{
    /**
     * Create a shipping label/tracking entry for the order.
     *
     * @return array{courier: string, tracking_number: string, tracking_url: string}
     */
    public function createShipment(Order $order): array;
}
