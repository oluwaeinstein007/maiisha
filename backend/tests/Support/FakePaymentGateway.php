<?php

namespace Tests\Support;

use App\Contracts\PaymentGateway;
use Illuminate\Support\Str;
use RuntimeException;

class FakePaymentGateway implements PaymentGateway
{
    public bool $shouldFail = false;

    public bool $shouldFailRefund = false;

    public array $calls = [];

    public array $refundCalls = [];

    public function createPaymentIntent(int $amountPence, string $currency, array $metadata): array
    {
        $this->calls[] = compact('amountPence', 'currency', 'metadata');

        if ($this->shouldFail) {
            throw new RuntimeException('Simulated gateway failure.');
        }

        return [
            'id' => 'pi_fake_'.Str::random(16),
            'client_secret' => 'pi_fake_secret_'.Str::random(16),
        ];
    }

    public function refund(string $paymentIntentId): array
    {
        $this->refundCalls[] = compact('paymentIntentId');

        if ($this->shouldFailRefund) {
            throw new RuntimeException('Simulated refund failure.');
        }

        return ['id' => 're_fake_'.Str::random(16), 'status' => 'succeeded'];
    }
}
