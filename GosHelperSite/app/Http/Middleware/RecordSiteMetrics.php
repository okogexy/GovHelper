<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class RecordSiteMetrics
{
    public function handle(Request $request, Closure $next): Response
    {
        $started = hrtime(true);
        $response = $next($request);
        $bucket = now()->format('YmdHi');
        $ttl = now()->addHours(2);
        $milliseconds = (int) round((hrtime(true) - $started) / 1_000_000);

        foreach ([
            "metrics:$bucket:requests" => 1,
            "metrics:$bucket:milliseconds" => $milliseconds,
            "metrics:$bucket:errors" => $response->getStatusCode() >= 500 ? 1 : 0,
        ] as $key => $amount) {
            Cache::add($key, 0, $ttl);
            if ($amount) Cache::increment($key, $amount);
        }

        return $response;
    }
}
