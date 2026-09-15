<?php

namespace App\Contracts;

/**
 * Abstraction over transactional SMS (PRD §7.5). A real provider (e.g. Twilio)
 * becomes a second implementation bound via SMS_PROVIDER, no callers change.
 */
interface SmsProvider
{
    public function send(string $toPhoneNumber, string $message): void;
}
