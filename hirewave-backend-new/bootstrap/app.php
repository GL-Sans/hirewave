<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',   // << OBBLIGATORIO
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {

        // Middleware Sanctum per SPA (session-based)
        $middleware->append(
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class
        );

        // Middleware globale CORS
        $middleware->append(
            \Illuminate\Http\Middleware\HandleCors::class
        );

        // Disattiva CSRF per tutte le API REST
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })
    ->create();
