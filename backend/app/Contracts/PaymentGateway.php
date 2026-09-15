<?php

namespace App\Contracts;

interface PaymentGateway
{
    /**
     * @return array{id: string, client_secret: string}
     */
    public function createPaymentIntent(int $amountPence, string $currency, array $metadata): array;
}
