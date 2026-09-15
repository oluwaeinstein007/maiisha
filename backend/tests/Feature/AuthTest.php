<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CarriesSessionCookies;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use CarriesSessionCookies, RefreshDatabase;

    public function test_a_user_can_register(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertOk()->assertJsonPath('user.email', 'jane@example.com');
        $this->assertDatabaseHas('users', ['email' => 'jane@example.com', 'role' => 'customer']);
        $this->assertAuthenticated();
    }

    public function test_registration_requires_matching_password_confirmation(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'password' => 'password123',
            'password_confirmation' => 'nope',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_a_user_can_log_in_with_correct_credentials(): void
    {
        User::factory()->create([
            'email' => 'jane@example.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'jane@example.com',
            'password' => 'password123',
        ]);

        $response->assertOk();
        $this->assertAuthenticated();
    }

    public function test_login_fails_with_incorrect_password(): void
    {
        User::factory()->create(['email' => 'jane@example.com', 'password' => bcrypt('password123')]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'jane@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertUnprocessable();
        $this->assertGuest();
    }

    public function test_repeated_failed_logins_are_rate_limited(): void
    {
        User::factory()->create(['email' => 'jane@example.com', 'password' => bcrypt('password123')]);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', ['email' => 'jane@example.com', 'password' => 'wrong'])
                ->assertUnprocessable();
        }

        $this->postJson('/api/auth/login', ['email' => 'jane@example.com', 'password' => 'wrong'])
            ->assertStatus(429);
    }

    public function test_a_logged_in_user_can_log_out(): void
    {
        $user = User::factory()->create(['password' => bcrypt('password123')]);

        // Drive this through the real cookie-based session flow (not actingAs(), which
        // sets the guard directly and so can't exercise session invalidation on logout).
        $login = $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'password123']);
        $login->assertOk();
        $preLogoutSessionId = $this->plainCookiesFrom($login)[config('session.cookie')];

        $logout = $this->withCookies($this->plainCookiesFrom($login))->postJson('/api/auth/logout');
        $logout->assertOk();

        // Logging out must rotate the session id (old id's data, including the
        // auth marker, is destroyed) — replaying the old cookie is covered by a
        // real end-to-end check outside PHPUnit's array-session-driver test harness.
        $postLogoutSessionId = $this->plainCookiesFrom($logout)[config('session.cookie')];
        $this->assertNotEquals($preLogoutSessionId, $postLogoutSessionId);
    }
}
