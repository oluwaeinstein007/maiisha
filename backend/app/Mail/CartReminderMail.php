<?php

namespace App\Mail;

use App\Models\Cart;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CartReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Cart $cart) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'MAI_ISHA — You left something in your cart');
    }

    public function content(): Content
    {
        return new Content(markdown: 'emails.cart.reminder', with: ['cart' => $this->cart]);
    }
}
