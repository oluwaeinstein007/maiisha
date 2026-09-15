<?php

namespace App\Services;

use App\Contracts\SmsProvider;
use App\Mail\OrderStatusMail;
use App\Models\Order;
use Illuminate\Support\Facades\Mail;

/**
 * Sends both email and SMS at order milestones per FR-18 (placed, shipped,
 * out for delivery/delivered) — always both channels, per client preference.
 */
class OrderNotifier
{
    public function __construct(private readonly SmsProvider $smsProvider) {}

    public function placed(Order $order): void
    {
        $this->notify($order, 'Order placed');
    }

    public function shipped(Order $order): void
    {
        $this->notify($order, 'Shipped');
    }

    public function outForDelivery(Order $order): void
    {
        $this->notify($order, 'Out for delivery');
    }

    public function delivered(Order $order): void
    {
        $this->notify($order, 'Delivered');
    }

    private function notify(Order $order, string $statusLabel): void
    {
        $user = $order->user;

        Mail::to($user->email)->send(new OrderStatusMail($order, $statusLabel));

        if ($user->phone) {
            $this->smsProvider->send(
                $user->phone,
                "MAI_ISHA: order {$order->order_number} — {$statusLabel}."
            );
        }
    }
}
