<?php

namespace App\Services;

use App\Contracts\PaymentGateway;
use RuntimeException;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;

class StripePaymentGateway implements PaymentGateway
{
    public function __construct(private readonly StripeClient $stripe) {}

    public function createPaymentIntent(int $amountPence, string $currency, array $metadata): array
    {
        try {
            $intent = $this->stripe->paymentIntents->create([
                'amount' => $amountPence,
                'currency' => strtolower($currency),
                'automatic_payment_methods' => ['enabled' => true],
                'metadata' => $metadata,
            ]);
        } catch (ApiErrorException $e) {
            // Callers only need to know "the gateway failed", not Stripe's exception types.
            throw new RuntimeException('Payment gateway error: '.$e->getMessage(), previous: $e);
        }

        return ['id' => $intent->id, 'client_secret' => $intent->client_secret];
    }
}
