<?php

namespace App\Services;

use App\Contracts\SmsProvider;
use Illuminate\Support\Facades\Log;

/**
 * Stand-in until an SMS provider is contracted (PRD §9). Logs instead of
 * sending, so notification call sites are real and swapping the provider
 * later is a rebinding in AppServiceProvider, not a rewrite.
 */
class LogSmsProvider implements SmsProvider
{
    public function send(string $toPhoneNumber, string $message): void
    {
        Log::info("SMS to {$toPhoneNumber}: {$message}");
    }
}
