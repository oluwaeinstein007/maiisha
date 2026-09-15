<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderStatusMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Order $order,
        public string $statusLabel,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "MAI_ISHA — Order {$this->order->order_number}: {$this->statusLabel}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.orders.status',
            with: [
                'order' => $this->order,
                'statusLabel' => $this->statusLabel,
            ],
        );
    }
}
