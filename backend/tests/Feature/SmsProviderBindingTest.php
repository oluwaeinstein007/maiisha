<?php

namespace Tests\Feature;

use App\Contracts\SmsProvider;
use App\Services\LogSmsProvider;
use App\Services\TwilioSmsProvider;
use Tests\TestCase;

class SmsProviderBindingTest extends TestCase
{
    public function test_default_config_binds_the_log_provider(): void
    {
        config(['services.sms.provider' => 'log']);

        $this->assertInstanceOf(LogSmsProvider::class, $this->app->make(SmsProvider::class));
    }

    public function test_twilio_config_binds_the_twilio_provider(): void
    {
        config([
            'services.sms.provider' => 'twilio',
            'services.twilio.sid' => 'AC_fake_sid',
            'services.twilio.token' => 'fake_token',
            'services.twilio.from' => '+15551234567',
        ]);

        $this->assertInstanceOf(TwilioSmsProvider::class, $this->app->make(SmsProvider::class));
    }
}
