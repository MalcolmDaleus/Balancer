<?php

use App\Exceptions\DomainException;
use App\Exceptions\MonthLockedException;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureOnboarded;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Carbon\Exceptions\InvalidFormatException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->alias([
            'onboarded' => EnsureOnboarded::class,
            'admin' => EnsureAdmin::class,
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->api(prepend: [
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Domain / business-rule failures — { error, message, ... }
        $exceptions->render(function (DomainException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return new JsonResponse(array_merge([
                    'error' => $e->error,
                    'message' => $e->getMessage(),
                ], $e->extra), $e->status);
            }
        });

        // Invalid date/month parse — 422 (API safety net when FormRequest missed a path)
        $exceptions->render(function (InvalidFormatException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return new JsonResponse([
                    'error' => 'invalid_date',
                    'message' => 'The given date or month could not be parsed.',
                ], 422);
            }
        });

        // Month locked — 423 (applies everywhere, but most relevant on API)
        $exceptions->render(function (MonthLockedException $e) {
            return new JsonResponse([
                'error' => 'month_locked',
                'message' => $e->getMessage(),
                'month' => $e->month->toDateString(),
            ], JsonResponse::HTTP_LOCKED);
        });

        // Unauthenticated — 401 (API-only; web redirects to login)
        $exceptions->render(function (AuthenticationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return new JsonResponse([
                    'error' => 'unauthenticated',
                    'message' => 'Authentication required.',
                ], 401);
            }
        });

        // Unauthorized — 403
        $exceptions->render(function (AuthorizationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $message = $e->getMessage();

                return new JsonResponse([
                    'error' => 'forbidden',
                    'message' => $message !== '' ? $message : 'This action is unauthorized.',
                ], 403);
            }
        });

        // Validation — 422
        $exceptions->render(function (ValidationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return new JsonResponse([
                    'error' => 'validation_failed',
                    'message' => 'The given data was invalid.',
                    'details' => $e->errors(),
                ], 422);
            }
        });

        // Model not found is wrapped as NotFoundHttpException; keep the JSON clean.
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return new JsonResponse([
                    'error' => 'not_found',
                    'message' => 'The requested resource was not found.',
                ], 404);
            }
        });

        // Branded HTML error pages when debug output is off; JSON/API responses are untouched.
        $exceptions->respond(function (SymfonyResponse $response, Throwable $e, Request $request) {
            $status = $response->getStatusCode();

            if (config('app.debug') || $request->is('api/*') || $request->expectsJson()) {
                return $response;
            }

            if (in_array($status, [403, 404, 500, 503], true)) {
                return Inertia::render('error', ['status' => $status])
                    ->toResponse($request)
                    ->setStatusCode($status);
            }

            if ($status === 419) {
                return back()->with('status', 'The page expired. Please try again.');
            }

            return $response;
        });
    })->create();
