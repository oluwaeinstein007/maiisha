<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Sanctum only treats a request as "from the frontend" (and therefore
        // session/cookie backed) when Origin/Referer matches a stateful domain —
        // mirror what the real Next.js app sends so cart/auth tests exercise
        // the same code path as production.
        $this->withHeaders([
            'Origin' => 'http://localhost:3000',
            'Referer' => 'http://localhost:3000/',
        ]);

        // postJson()/getJson() only attach cookies when this is set — mirrors the
        // real frontend's fetch(..., { credentials: 'include' }).
        $this->withCredentials();
    }
}
