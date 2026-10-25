<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\View\View;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): RedirectResponse
    {
        $user = DB::transaction(function () use ($request): User {
            $user = User::create(['name' => $request->string('name'), 'email' => $request->string('email'), 'password' => Hash::make($request->string('password'))]);
            if (config('govhelper.auto_verify_local')) {
                $user->markEmailAsVerified();
            }
            return $user;
        });
        event(new Registered($user));
        Auth::login($user);
        $request->session()->regenerate();

        return $user->hasVerifiedEmail() ? redirect()->route('dashboard') : redirect()->route('verification.notice');
    }

    public function login(LoginRequest $request): RedirectResponse
    {
        if (! Auth::attempt($request->safe()->only('email', 'password'), $request->boolean('remember'))) {
            return back()->withErrors(['email' => 'Не удалось войти с указанными данными.'])->onlyInput('email');
        }
        if ($request->user()->is_blocked) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return back()->withErrors(['email' => 'Не удалось войти с указанными данными.'])->onlyInput('email');
        }
        if (config('govhelper.auto_verify_local') && ! $request->user()->hasVerifiedEmail()) {
            $request->user()->markEmailAsVerified();
        }
        $request->session()->regenerate();
        $request->user()->forceFill(['last_login_at' => now(), 'last_login_ip' => $request->ip()])->save();

        return redirect()->intended(route('dashboard'));
    }

    public function verificationNotice(Request $request): RedirectResponse|View
    {
        if (config('govhelper.auto_verify_local') && ! $request->user()->hasVerifiedEmail()) {
            $request->user()->markEmailAsVerified();

            return redirect()->route('dashboard');
        }

        return view('auth.verify-email');
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
