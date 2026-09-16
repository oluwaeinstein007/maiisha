<?php

namespace Tests\Support;

use App\Contracts\SmsProvider;

class FakeSmsProvider implements SmsProvider
{
    public array $calls = [];

    public function send(string $toPhoneNumber, string $message): void
    {
        $this->calls[] = compact('toPhoneNumber', 'message');
    }
}
