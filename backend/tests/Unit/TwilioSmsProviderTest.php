<?php

namespace Tests\Unit;

use App\Services\TwilioSmsProvider;
use PHPUnit\Framework\TestCase;
use RuntimeException;
use Tests\Support\FakeTwilioHttpClient;
use Twilio\Rest\Client as TwilioClient;

class TwilioSmsProviderTest extends TestCase
{
    public function test_send_posts_the_message_to_the_from_number_and_recipient(): void
    {
        $http = new FakeTwilioHttpClient;
        $client = new TwilioClient('AC_fake_sid', 'fake_token', 'AC_fake_sid', null, $http);
        $provider = new TwilioSmsProvider($client, '+15551234567');

        $provider->send('+15559876543', 'MAI_ISHA: order MAI-1 — Order placed.');

        $this->assertCount(1, $http->requests);
        $request = $http->requests[0];
        $this->assertSame('+15559876543', $request['data']['To']);
        $this->assertSame('+15551234567', $request['data']['From']);
        $this->assertSame('MAI_ISHA: order MAI-1 — Order placed.', $request['data']['Body']);
    }

    public function test_send_wraps_a_twilio_failure_in_a_runtime_exception(): void
    {
        $http = new FakeTwilioHttpClient(statusCode: 400, responseBody: [
            'code' => 21211,
            'message' => 'The \'To\' number is not a valid phone number.',
            'status' => 400,
        ]);
        $client = new TwilioClient('AC_fake_sid', 'fake_token', 'AC_fake_sid', null, $http);
        $provider = new TwilioSmsProvider($client, '+15551234567');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('SMS provider error:');

        $provider->send('not-a-number', 'Hello');
    }
}
