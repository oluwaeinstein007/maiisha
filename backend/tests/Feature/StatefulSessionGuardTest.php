<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A request with no matching Origin/Referer never gets session middleware
 * (Sanctum's EnsureFrontendRequestsAreStateful), so any endpoint touching
 * $request->session() would otherwise crash with a raw 500 for such callers
 * (curl, bots, bare API clients) — see EnsureSessionIsAvailable.
 */
class StatefulSessionGuardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // The base TestCase sets a stateful Origin/Referer by default (so the
        // rest of the suite exercises the real frontend's behaviour) — remove
        // them here to reproduce exactly the "no stateful domain" scenario.
        unset($this->defaultHeaders['Origin'], $this->defaultHeaders['Referer']);
    }

    public function test_login_without_a_stateful_origin_returns_a_clean_400_not_a_500(): void
    {
        $response = $this->postJson('/api/auth/login', ['email' => 'x@example.com', 'password' => 'wrong']);

        $response->assertStatus(400);
        $this->assertStringContainsString('requires a browser session', $response->json('message'));
    }

    public function test_register_without_a_stateful_origin_returns_a_clean_400(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test', 'email' => 'x@example.com', 'password' => 'password123', 'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(400);
    }

    public function test_cart_without_a_stateful_origin_returns_a_clean_400(): void
    {
        $this->getJson('/api/cart')->assertStatus(400);
    }

    public function test_login_with_a_stateful_origin_still_works_normally(): void
    {
        $response = $this->withHeaders(['Origin' => 'http://localhost:3000', 'Referer' => 'http://localhost:3000/'])
            ->postJson('/api/auth/login', ['email' => 'x@example.com', 'password' => 'wrong']);

        // Past the session guard, into normal validation — proves the guard
        // doesn't interfere with legitimate stateful requests.
        $response->assertUnprocessable();
    }
}
