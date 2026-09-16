<?php

namespace Tests\Support;

use Twilio\AuthStrategy\AuthStrategy;
use Twilio\Http\Client as HttpClient;
use Twilio\Http\Response;

/**
 * Stands in for Twilio's CurlClient so TwilioSmsProvider tests exercise the
 * real Twilio SDK request/response handling without hitting the network.
 */
class FakeTwilioHttpClient implements HttpClient
{
    public array $requests = [];

    public function __construct(
        private readonly int $statusCode = 201,
        private readonly array $responseBody = ['sid' => 'SM_fake', 'status' => 'queued'],
    ) {}

    public function request(
        string $method,
        string $url,
        array $params = [],
        array $data = [],
        array $headers = [],
        ?string $user = null,
        ?string $password = null,
        ?int $timeout = null,
        ?AuthStrategy $authStrategy = null,
    ): Response {
        $this->requests[] = compact('method', 'url', 'params', 'data', 'headers');

        return new Response($this->statusCode, json_encode($this->responseBody));
    }
}
