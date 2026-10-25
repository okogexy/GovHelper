<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class ProgramAuthController extends Controller
{
    public function ping(): JsonResponse
    {
        return response()->json(['ok' => true, 'service' => 'govhelper-auth']);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:1000'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);
        $user = User::where('email', mb_strtolower(trim($data['email'])))->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Неверная почта или пароль.'], 422);
        }
        if ($user->is_blocked) {
            return response()->json(['message' => 'Аккаунт заблокирован.'], 403);
        }
        if (config('govhelper.auto_verify_local') && ! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }
        if (! $user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Подтвердите email на сайте.'], 403);
        }

        return $this->issueToken($request, $user, $data['device_name'] ?? null);
    }

    public function register(Request $request): JsonResponse
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
            'email' => mb_strtolower(trim((string) $request->input('email'))),
        ]);
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(12)->mixedCase()->numbers()->symbols()],
            'terms' => ['accepted'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);

        $user = DB::transaction(function () use ($data): User {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
            ]);
            if (config('govhelper.auto_verify_local')) {
                $user->markEmailAsVerified();
            }
            return $user;
        });
        event(new Registered($user));

        if (! $user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Аккаунт создан. Подтвердите email на сайте, затем войдите в программу.'], 202);
        }

        return $this->issueToken($request, $user, $data['device_name'] ?? null, 201);
    }

    private function issueToken(Request $request, User $user, ?string $requestedDeviceName, int $status = 200): JsonResponse
    {
        $deviceName = trim((string) $requestedDeviceName) ?: 'GOVHelper Desktop';
        $user->programAccessTokens()->where('expires_at', '<=', now())->delete();
        $user->programAccessTokens()->where('name', $deviceName)->delete();
        $staleIds = $user->programAccessTokens()->orderByDesc('last_used_at')->limit(1000)->pluck('id')->slice(9);
        if ($staleIds->isNotEmpty()) {
            $user->programAccessTokens()->whereKey($staleIds)->delete();
        }

        $raw = Str::of(base64_encode(random_bytes(64)))->replace(['+', '/', '='], ['-', '_', ''])->toString();
        $expiresAt = now()->addDays(30);
        $user->programAccessTokens()->create([
            'name' => $deviceName,
            'token_hash' => hash('sha256', $raw),
            'last_used_at' => now(),
            'expires_at' => $expiresAt,
        ]);
        $user->forceFill(['last_login_at' => now(), 'last_login_ip' => $request->ip()])->save();

        return response()->json([
            'token' => $raw,
            'token_type' => 'Bearer',
            'expires_at' => $expiresAt->toIso8601String(),
            'user' => $this->userData($user),
        ], $status);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->userData($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->attributes->get('program_token')?->delete();

        return response()->json(['ok' => true]);
    }

    private function userData(User $user): array
    {
        $subscription = $user->activeSubscription();
        $isPlus = $subscription?->isEntitled()
            && in_array($subscription?->plan?->slug, ['plus', 'pro'], true);

        return [
            'id' => $user->public_id,
            'name' => $user->name,
            'email' => $user->email,
            'plan' => $isPlus ? 'GOVHelper Plus' : 'GOVHelper Standard',
            'plan_slug' => $isPlus ? 'plus' : 'standard',
            'entitlements' => [
                'plus' => $isPlus,
                'ai' => $isPlus,
                'themes' => $isPlus,
            ],
        ];
    }
}
