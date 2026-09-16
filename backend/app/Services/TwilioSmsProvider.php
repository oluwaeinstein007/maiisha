<?php

namespace App\Services;

use App\Contracts\SmsProvider;
use RuntimeException;
use Twilio\Exceptions\TwilioException;
use Twilio\Rest\Client as TwilioClient;

/**
 * Default real SmsProvider (PRD FR-18). Twilio is a default pending client
 * sign-off on the final vendor (PRD §9) — nothing outside this class knows
 * it's Twilio, so swapping vendors later is a new implementation of
 * SmsProvider plus a rebinding in AppServiceProvider, not a rewrite of callers.
 */
class TwilioSmsProvider implements SmsProvider
{
    public function __construct(
        private readonly TwilioClient $client,
        private readonly string $fromNumber,
    ) {}

    public function send(string $toPhoneNumber, string $message): void
    {
        try {
            $this->client->messages->create($toPhoneNumber, [
                'from' => $this->fromNumber,
                'body' => $message,
            ]);
        } catch (TwilioException $e) {
            // Callers only need to know "the SMS provider failed", not Twilio's exception types.
            throw new RuntimeException('SMS provider error: '.$e->getMessage(), previous: $e);
        }
    }
}
