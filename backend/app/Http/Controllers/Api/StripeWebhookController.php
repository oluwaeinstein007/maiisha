<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DiscountCodeUsage;
use App\Models\Order;
use App\Models\Payment;
use App\Services\OrderNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;
use Symfony\Component\HttpFoundation\Response;

class StripeWebhookController extends Controller
{
    public function __construct(private readonly OrderNotifier $notifier) {}

    public function handle(Request $request)
    {
        try {
            $event = Webhook::constructEvent(
                $request->getContent(),
                $request->header('Stripe-Signature', ''),
                config('services.stripe.webhook_secret'),
            );
        } catch (SignatureVerificationException|\UnexpectedValueException $e) {
            Log::warning('Stripe webhook signature verification failed', ['error' => $e->getMessage()]);

            return response()->json(['error' => 'Invalid signature.'], Response::HTTP_BAD_REQUEST);
        }

        match ($event->type) {
            'payment_intent.succeeded' => $this->handleSucceeded($event->data->object),
            'payment_intent.payment_failed' => $this->handleFailed($event->data->object),
            default => null,
        };

        return response()->json(['received' => true]);
    }

    private function handleSucceeded(object $intent): void
    {
        $payment = Payment::where('provider_reference', $intent->id)->first();

        if (! $payment || $payment->status === 'succeeded') {
            return;
        }

        $payment->update(['status' => 'succeeded']);

        $order = $payment->order;
        $order->update(['status' => Order::STATUS_PLACED]);

        $this->notifier->placed($order->load('items', 'user'));
    }

    private function handleFailed(object $intent): void
    {
        $payment = Payment::where('provider_reference', $intent->id)->first();

        if (! $payment || $payment->status === 'failed') {
            return;
        }

        $payment->update(['status' => 'failed']);

        $order = $payment->order()->with('items.variant')->first();
        $order->update(['status' => Order::STATUS_CANCELLED]);

        foreach ($order->items as $item) {
            $item->variant?->increment('stock_quantity', $item->quantity);
        }

        DiscountCodeUsage::where('order_id', $order->id)->delete();
    }
}
