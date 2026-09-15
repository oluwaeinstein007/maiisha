<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sanctum's EnsureFrontendRequestsAreStateful only attaches a session to the
 * request when Origin/Referer matches a SANCTUM_STATEFUL_DOMAINS entry —
 * anything else (curl, a bare API client, a health-check bot, a future
 * token-authenticated mobile client hitting a session-only endpoint) reaches
 * the controller with no session at all. Register/login/logout unconditionally
 * touch $request->session(), so without this guard that's an unhandled
 * RuntimeException surfaced as a raw 500, instead of a clean, actionable error.
 */
class EnsureSessionIsAvailable
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->hasSession()) {
            return response()->json([
                'message' => 'This endpoint requires a browser session. Send an Origin or Referer header matching a configured frontend domain (see SANCTUM_STATEFUL_DOMAINS).',
            ], 400);
        }

        return $next($request);
    }
}
