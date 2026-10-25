<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\DownloadController;
use App\Models\Plan;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;

Route::view('/', 'home')->name('home');
Route::get('/pricing', fn () => view('pricing', ['plans' => Plan::where('is_active', true)->orderBy('sort_order')->get()]))->name('pricing');

Route::view('/login', 'auth.login')->middleware('guest')->name('login');
Route::post('/login', [AuthController::class, 'login'])->middleware(['guest', 'throttle:login']);
Route::view('/register', 'auth.register')->middleware('guest')->name('register');
Route::post('/register', [AuthController::class, 'register'])->middleware(['guest', 'throttle:register']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');
Route::view('/forgot-password', 'auth.forgot-password')->middleware('guest')->name('password.request');
Route::post('/forgot-password', function (Request $request) {
    $request->validate(['email' => 'required|email']);
    Password::sendResetLink($request->only('email'));
    return back()->with('status', 'Если адрес зарегистрирован, письмо отправлено.');
})->middleware(['guest', 'throttle:password-reset'])->name('password.email');
Route::get('/reset-password/{token}', fn (string $token, Request $request) => view('auth.reset-password', ['token' => $token, 'email' => $request->email]))->middleware('guest')->name('password.reset');
Route::post('/reset-password', function (Request $request) {
    $request->validate(['token' => 'required', 'email' => 'required|email', 'password' => ['required', 'confirmed', PasswordRule::min(12)->mixedCase()->numbers()->symbols()]]);
    $status = Password::reset($request->only('email', 'password', 'password_confirmation', 'token'), function ($user, $password) {
        $user->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
        $user->programAccessTokens()->delete();
        event(new PasswordReset($user));
    });
    return $status === Password::PasswordReset ? redirect()->route('login')->with('status', __($status)) : back()->withErrors(['email' => __($status)]);
})->middleware(['guest', 'throttle:password-reset'])->name('password.update');

Route::get('/verify-email', [AuthController::class, 'verificationNotice'])->middleware('auth')->name('verification.notice');
Route::get('/verify-email/{id}/{hash}', function (EmailVerificationRequest $request) { $request->fulfill(); return redirect()->route('dashboard'); })->middleware(['auth', 'signed'])->name('verification.verify');
Route::post('/email/verification-notification', function (Request $request) { $request->user()->sendEmailVerificationNotification(); return back()->with('status', 'Ссылка отправлена.'); })->middleware(['auth', 'throttle:email-verification'])->name('verification.send');

Route::post('/webhooks/enot', [CheckoutController::class, 'webhook'])->middleware('throttle:checkout')->name('webhooks.enot');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('/checkout/{plan}', [CheckoutController::class, 'store'])->middleware(['signed', 'throttle:checkout'])->name('checkout.store');
    Route::get('/checkout/{payment}/success', [CheckoutController::class, 'success'])->name('checkout.success');
    Route::get('/checkout/{payment}/fail', [CheckoutController::class, 'fail'])->name('checkout.fail');

    Route::prefix('dashboard')->group(function () {
        Route::view('/', 'dashboard.index')->name('dashboard');
        foreach (['profile', 'security', 'subscription', 'license', 'devices', 'downloads'] as $page) {
            Route::view('/'.$page, 'dashboard.page', ['page' => $page])->name('dashboard.'.$page);
        }
        Route::get('/downloads/{release}', DownloadController::class)->middleware('throttle:download')->name('dashboard.download');
    });
});

Route::middleware(['auth', 'verified', 'admin'])->prefix('admin')->group(function () {
    Route::get('/{section?}', [AdminController::class, 'index'])->where('section', 'overview|site|users|plans|subscriptions|payments|licenses|releases|audit-log|system')->name('admin');
    Route::put('/settings/site', [AdminController::class, 'updateSite'])->name('admin.site.update');
    Route::put('/settings/payments', [AdminController::class, 'updatePayments'])->name('admin.payments.update');
    Route::put('/users/{user}', [AdminController::class, 'updateUser'])->name('admin.users.update');
    Route::post('/plans', [AdminController::class, 'savePlan'])->name('admin.plans.store');
    Route::put('/plans/{plan}', [AdminController::class, 'savePlan'])->name('admin.plans.update');
    Route::post('/subscriptions', [AdminController::class, 'createSubscription'])->name('admin.subscriptions.store');
    Route::delete('/subscriptions/{subscription}', [AdminController::class, 'cancelSubscription'])->name('admin.subscriptions.cancel');
    Route::post('/payments/{payment}/sync', [AdminController::class, 'syncPayment'])->name('admin.payments.sync');
    Route::delete('/licenses/{license}', [AdminController::class, 'revokeLicense'])->name('admin.licenses.revoke');
    Route::put('/releases/{release}', [AdminController::class, 'updateRelease'])->name('admin.releases.update');
});

foreach (['privacy', 'terms', 'refund'] as $page) Route::view('/legal/'.$page, 'legal', ['page' => $page])->name('legal.'.$page);
