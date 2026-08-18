<?php

use App\Exceptions\DomainException;
use App\Exceptions\MonthLockedException;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Carbon\Exceptions\InvalidFormatException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->api(prepend: [
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \Illuminate\Session\Middleware\StartSession::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Domain / business-rule failures — { error, message, ... }
        $exceptions->render(function (DomainException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return new JsonResponse(array_merge([
                    'error'   => $e->error,
                    'message' => $e->getMessage(),
                ], $e->extra), $e->status);
            }
        });

        // Invalid date/month parse — 422 (API safety net when FormRequest missed a path)
        $exceptions->render(function (InvalidFormatException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return new JsonResponse([
                    'error'   => 'invalid_date',
                    'message' => 'The given date or month could not be parsed.',
                ], 422);
            }
        });

        // Month locked — 423 (applies everywhere, but most relevant on API)
        $exceptions->render(function (MonthLockedException $e) {
            return new JsonResponse([
                'error'   => 'month_locked',
                'message' => $e->getMessage(),
                'month'   => $e->month->toDateString(),
            ], JsonResponse::HTTP_LOCKED);
        });

        // Unauthenticated — 401 (API-only; web redirects to login)
        $exceptions->render(function (AuthenticationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return new JsonResponse([
                    'error'   => 'unauthenticated',
                    'message' => 'Authentication required.',
                ], 401);
            }
        });

        // Unauthorized — 403 (includes unverified email via EnsureEmailIsVerified)
        $exceptions->render(function (AuthorizationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $message = $e->getMessage();
                $error = str_contains(strtolower($message), 'verified')
                    ? 'email_unverified'
                    : 'forbidden';

                return new JsonResponse([
                    'error'   => $error,
                    'message' => $message !== '' ? $message : 'This action is unauthorized.',
                ], 403);
            }
        });

        // Validation — 422
        $exceptions->render(function (ValidationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return new JsonResponse([
                    'error'   => 'validation_failed',
                    'message' => 'The given data was invalid.',
                    'details' => $e->errors(),
                ], 422);
            }
        });

        // Model not found — 404
        $exceptions->render(function (ModelNotFoundException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return new JsonResponse([
                    'error'   => 'not_found',
                    'message' => 'The requested resource was not found.',
                ], 404);
            }
        });
    })->create();
