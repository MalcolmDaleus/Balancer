<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOnboarded
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user === null || $user->isOnboarded()) {
            return $next($request);
        }

        if ($request->is('api/*') || $request->expectsJson()) {
            return response()->json([
                'error' => 'onboard_required',
                'message' => 'Finish setting up available cash and savings before using the app.',
            ], 403);
        }

        return redirect()->route('onboarding');
    }
}
