<?php

namespace Tests\Feature;

use App\Models\Release;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_open_dashboard(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_user_can_register_and_password_is_not_plaintext(): void
    {
        $response = $this->post('/register', ['name' => 'Тест', 'email' => 'USER@EXAMPLE.COM', 'password' => 'Strong!Pass123', 'password_confirmation' => 'Strong!Pass123', 'terms' => '1']);
        $response->assertRedirect('/verify-email');
        $user = User::first();
        $this->assertSame('user@example.com', $user->email);
        $this->assertNotSame('Strong!Pass123', $user->password);
        $this->assertSame('user', $user->role);
    }

    public function test_local_registration_is_immediately_available_to_desktop_app(): void
    {
        config(['govhelper.auto_verify_local' => true]);
        $this->post('/register', ['name' => 'Локальный тест', 'email' => 'local@example.com', 'password' => 'Strong!Pass123', 'password_confirmation' => 'Strong!Pass123', 'terms' => '1'])->assertRedirect('/dashboard');
        $user = User::sole();
        $this->assertTrue($user->hasVerifiedEmail());
        $this->postJson('/api/v1/program/login', ['email' => $user->email, 'password' => 'Strong!Pass123', 'device_name' => 'Local PC'])->assertOk()->assertJsonPath('user.email', $user->email);
    }

    public function test_existing_local_account_is_auto_verified(): void
    {
        config(['govhelper.auto_verify_local' => true]);
        $user = User::factory()->unverified()->create(['password' => 'Strong!Pass123']);
        $this->post('/login', ['email' => $user->email, 'password' => 'Strong!Pass123'])->assertRedirect('/dashboard');
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }

    public function test_login_regenerates_access_and_logout_ends_session(): void
    {
        $user = User::factory()->create(['email_verified_at' => now(), 'password' => 'Strong!Pass123']);
        $this->post('/login', ['email' => $user->email, 'password' => 'Strong!Pass123'])->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($user);
        $this->post('/logout')->assertRedirect('/');
        $this->assertGuest();
    }

    public function test_blocked_user_is_not_left_authenticated(): void
    {
        $user = User::factory()->create(['email_verified_at' => now(), 'password' => 'Strong!Pass123', 'is_blocked' => true]);
        $this->post('/login', ['email' => $user->email, 'password' => 'Strong!Pass123'])->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_normal_user_cannot_open_admin(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $this->actingAs($user)->get('/admin')->assertForbidden();
    }

    public function test_unverified_user_cannot_download(): void
    {
        $user = User::factory()->unverified()->create();
        $release = Release::create(['version' => '1.0.0', 'channel' => 'stable', 'platform' => 'windows', 'filename' => 'setup.exe', 'storage_disk' => 'local', 'storage_path' => 'releases/setup.exe', 'size_bytes' => 1, 'sha256' => str_repeat('a', 64), 'published_at' => now(), 'is_active' => true]);
        $this->actingAs($user)->get('/dashboard/downloads/'.$release->public_id)->assertRedirect('/verify-email');
    }
}
