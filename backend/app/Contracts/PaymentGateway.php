<?php

namespace App\Contracts;

interface PaymentGateway
{
    /**
     * @return array{id: string, client_secret: string}
     */
    public function createPaymentIntent(int $amountPence, string $currency, array $metadata): array;

    /**
     * Refunds a payment in full. $paymentIntentId is what createPaymentIntent()
     * returned as 'id' — the order's Payment::provider_reference.
     *
     * @return array{id: string, status: string}
     */
    public function refund(string $paymentIntentId): array;
}
