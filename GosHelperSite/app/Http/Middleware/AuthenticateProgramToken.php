<?php

namespace App\Http\Middleware;

use App\Models\ProgramAccessToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateProgramToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $raw = $request->bearerToken();
        $token = $raw ? ProgramAccessToken::with('user')->where('token_hash', hash('sha256', $raw))->first() : null;
        if (! $token || $token->expires_at->isPast() || ! $token->user || $token->user->is_blocked) {
            $token?->delete();

            return response()->json(['message' => 'Сессия истекла. Войдите снова.'], 401);
        }
        if (! $token->user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Подтвердите email на сайте.'], 403);
        }
        if (! $token->last_used_at || $token->last_used_at->lt(now()->subMinutes(5))) {
            $token->forceFill(['last_used_at' => now()])->save();
        }
        $request->attributes->set('program_token', $token);
        $request->setUserResolver(fn () => $token->user);

        return $next($request);
    }
}
