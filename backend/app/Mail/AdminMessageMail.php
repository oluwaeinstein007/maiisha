<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * A one-off message an admin sends to a customer from their account page (e.g. a
 * question about an order, a delivery update outside the usual milestones). Not
 * queued: this is sent while the admin is waiting on the request, same as the
 * order-status mail — either it succeeds or the admin sees the error immediately.
 */
class AdminMessageMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $customer,
        // Not $subject: Mailable already declares that property (untyped, for its
        // own envelope-building machinery), and redeclaring it here with a `string`
        // type is a hard PHP fatal ("type must not be defined"), not just a lint issue.
        public string $subjectLine,
        public string $body,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->subjectLine,
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.admin.message',
            with: [
                'customer' => $this->customer,
                'body' => $this->body,
            ],
        );
    }
}
