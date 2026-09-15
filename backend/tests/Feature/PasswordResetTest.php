<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_response_is_identical_for_a_registered_and_unregistered_email(): void
    {
        User::factory()->create(['email' => 'exists@example.com']);

        $forExisting = $this->postJson('/api/auth/forgot-password', ['email' => 'exists@example.com']);
        $forMissing = $this->postJson('/api/auth/forgot-password', ['email' => 'nobody@example.com']);

        $forExisting->assertOk();
        $forMissing->assertOk();
        $this->assertEquals($forExisting->json('message'), $forMissing->json('message'));
    }

    public function test_a_user_can_reset_their_password_with_a_valid_token(): void
    {
        $user = User::factory()->create(['password' => bcrypt('old-password')]);
        $token = Password::createToken($user);

        $response = $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('new-password123', $user->fresh()->password));
    }

    public function test_an_invalid_token_is_rejected(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/auth/reset-password', [
            'token' => 'not-a-real-token',
            'email' => $user->email,
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ]);

        $response->assertUnprocessable();
    }
}
