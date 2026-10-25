<?php

namespace App\Http\Middleware;

use App\Models\SiteSetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforceSiteMaintenance
{
    public function handle(Request $request, Closure $next): Response
    {
        $allowed = $request->is('admin', 'admin/*', 'login', 'logout', 'api/*', 'webhooks/*', 'up');
        if (! $allowed && (SiteSetting::values()['maintenance_mode'] ?? '0') === '1') {
            return response()->view('errors.maintenance', status: 503);
        }
        return $next($request);
    }
}
