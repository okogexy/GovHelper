<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\View;
use App\Models\SiteSetting;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('login', fn(Request $r)=>Limit::perMinute(5)->by(hash('sha256',$r->ip().'|'.mb_strtolower((string)$r->email))));
        RateLimiter::for('register', fn(Request $r)=>Limit::perHour(5)->by($r->ip()));
        RateLimiter::for('password-reset', fn(Request $r)=>Limit::perMinute(3)->by(hash('sha256',$r->ip().'|'.mb_strtolower((string)$r->email))));
        RateLimiter::for('email-verification', fn(Request $r)=>Limit::perMinute(3)->by((string)$r->user()?->id));
        RateLimiter::for('download', fn(Request $r)=>Limit::perMinute(10)->by((string)$r->user()?->id));
        RateLimiter::for('license-api', fn(Request $r)=>Limit::perMinute(20)->by(hash('sha256',$r->ip().'|'.substr((string)$r->license_key,0,12))));
        RateLimiter::for('program-api', fn(Request $r)=>Limit::perMinute(60)->by(hash('sha256',$r->ip().'|'.substr((string)$r->bearerToken(),0,16))));
        RateLimiter::for('checkout', fn(Request $r)=>Limit::perMinute(12)->by((string)($r->user()?->id ?? $r->ip())));
        View::composer('*', fn ($view) => $view->with('siteSettings', SiteSetting::values()));
    }
}
