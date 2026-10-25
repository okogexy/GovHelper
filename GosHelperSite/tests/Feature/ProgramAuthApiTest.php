<?php

namespace Tests\Feature;

use App\Models\ProgramAccessToken;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProgramAuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_program_api_healthcheck_is_public(): void
    {
        $this->getJson('/api/v1/program/ping')->assertOk()->assertJson(['ok' => true, 'service' => 'govhelper-auth']);
    }

    public function test_verified_user_can_login_read_profile_and_logout(): void
    {
        $user = User::factory()->create(['email' => 'agent@example.com', 'email_verified_at' => now(), 'password' => 'Strong!Pass123']);
        $login = $this->postJson('/api/v1/program/login', ['email' => 'AGENT@EXAMPLE.COM', 'password' => 'Strong!Pass123', 'device_name' => 'Test PC'])->assertOk();
        $token = $login->json('token');
        $this->assertNotEmpty($token);
        $this->assertDatabaseMissing('program_access_tokens', ['token_hash' => $token]);
        $this->withToken($token)->getJson('/api/v1/program/me')->assertOk()->assertJsonPath('user.email', $user->email);
        $this->withToken($token)->postJson('/api/v1/program/logout')->assertOk();
        $this->assertSame(0, ProgramAccessToken::count());
    }

    public function test_program_registration_creates_shared_local_account_and_token(): void
    {
        config(['govhelper.auto_verify_local' => true]);

        $response = $this->postJson('/api/v1/program/register', [
            'name' => 'Новый сотрудник',
            'email' => 'NEW.AGENT@EXAMPLE.COM',
            'password' => 'Strong!Pass123',
            'password_confirmation' => 'Strong!Pass123',
            'terms' => true,
            'device_name' => 'Registration PC',
        ])->assertCreated()
            ->assertJsonPath('user.email', 'new.agent@example.com')
            ->assertJsonPath('user.plan_slug', 'standard');

        $this->assertNotEmpty($response->json('token'));
        $this->assertDatabaseHas('users', ['email' => 'new.agent@example.com']);
        $this->assertDatabaseCount('program_access_tokens', 1);
    }

    public function test_program_registration_rejects_weak_password_and_duplicate_email(): void
    {
        User::factory()->create(['email' => 'agent@example.com']);

        $this->postJson('/api/v1/program/register', [
            'name' => 'Agent', 'email' => 'agent@example.com', 'password' => 'weak',
            'password_confirmation' => 'weak', 'terms' => true,
        ])->assertUnprocessable()->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_plus_subscription_unlocks_paid_program_features(): void
    {
        $user = User::factory()->create(['email_verified_at' => now(), 'password' => 'Strong!Pass123']);
        $plan = Plan::create([
            'slug' => 'plus', 'name' => 'GOVHelper Plus', 'price_monthly' => 29900,
            'price_yearly' => 299000, 'currency' => 'RUB', 'trial_days' => 0,
            'device_limit' => 2, 'features' => ['AI-помощник', 'Темы'],
            'is_active' => true, 'sort_order' => 1,
        ]);
        Subscription::create([
            'user_id' => $user->id, 'plan_id' => $plan->id, 'status' => 'active',
            'starts_at' => now(), 'ends_at' => now()->addMonth(),
        ]);

        $this->postJson('/api/v1/program/login', [
            'email' => $user->email, 'password' => 'Strong!Pass123',
        ])->assertOk()
            ->assertJsonPath('user.plan', 'GOVHelper Plus')
            ->assertJsonPath('user.plan_slug', 'plus')
            ->assertJsonPath('user.entitlements.ai', true)
            ->assertJsonPath('user.entitlements.themes', true);
    }

    public function test_invalid_credentials_are_rejected(): void
    {
        User::factory()->create(['email' => 'agent@example.com', 'email_verified_at' => now(), 'password' => 'Strong!Pass123']);
        $this->postJson('/api/v1/program/login', ['email' => 'agent@example.com', 'password' => 'wrong'])->assertUnprocessable()->assertJsonPath('message', 'Неверная почта или пароль.');
    }

    public function test_unverified_user_is_rejected(): void
    {
        $user = User::factory()->unverified()->create(['password' => 'Strong!Pass123']);
        $this->postJson('/api/v1/program/login', ['email' => $user->email, 'password' => 'Strong!Pass123'])->assertForbidden();
    }

    public function test_blocked_user_and_expired_token_are_rejected(): void
    {
        $blocked = User::factory()->create(['email_verified_at' => now(), 'password' => 'Strong!Pass123', 'is_blocked' => true]);
        $this->postJson('/api/v1/program/login', ['email' => $blocked->email, 'password' => 'Strong!Pass123'])->assertForbidden();
        $user = User::factory()->create(['email_verified_at' => now()]);
        $raw = 'expired-token';
        $user->programAccessTokens()->create(['name' => 'Old PC', 'token_hash' => hash('sha256', $raw), 'last_used_at' => now()->subMonth(), 'expires_at' => now()->subMinute()]);
        $this->withToken($raw)->getJson('/api/v1/program/me')->assertUnauthorized();
        $this->assertSame(0, ProgramAccessToken::count());
    }

    public function test_new_login_replaces_token_for_same_device(): void
    {
        $user = User::factory()->create(['email_verified_at' => now(), 'password' => 'Strong!Pass123']);
        $payload = ['email' => $user->email, 'password' => 'Strong!Pass123', 'device_name' => 'Main PC'];
        $first = $this->postJson('/api/v1/program/login', $payload)->assertOk()->json('token');
        $second = $this->postJson('/api/v1/program/login', $payload)->assertOk()->json('token');
        $this->assertNotSame($first, $second);
        $this->assertSame(1, ProgramAccessToken::count());
        $this->withToken($first)->getJson('/api/v1/program/me')->assertUnauthorized();
        $this->withToken($second)->getJson('/api/v1/program/me')->assertOk();
    }
}
