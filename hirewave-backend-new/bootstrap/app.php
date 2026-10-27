<?php

use App\Http\Controllers\HoneypotController;
use App\Http\Middleware\BlockBannedIps;
use App\Http\Middleware\SecurityHeaders;
use App\Support\SecurityLog;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',   // << OBBLIGATORIO
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {

        // Il frontend passa dal proxy di Vite (127.0.0.1), che inoltra l'IP vero in
        // X-Forwarded-For: senza fidarsi del proxy tutti risulterebbero 127.0.0.1.
        // Ci si fida SOLO del proxy locale; in produzione indicare il proxy reale
        // con TRUSTED_PROXIES (es. l'IP del load balancer).
        $middleware->trustProxies(
            at: array_filter(array_map('trim', explode(',', env('TRUSTED_PROXIES', '127.0.0.1,::1')))),
        );

        // IP bloccati: rifiutati prima di sessione, autenticazione e controller.
        // append (non prepend): deve girare dopo TrustProxies, che ricava l'IP reale
        $middleware->append(BlockBannedIps::class);

        // Header di sicurezza su tutte le risposte
        $middleware->append(SecurityHeaders::class);

        // Middleware Sanctum per SPA (session-based)
        $middleware->append(
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class
        );

        // Middleware globale CORS
        $middleware->append(
            \Illuminate\Http\Middleware\HandleCors::class
        );

        // CSRF attivo (l'autenticazione usa i cookie di sessione): il frontend
        // invia X-XSRF-TOKEN tramite axiosClient. Esclusi il webhook Stripe, che
        // non ha cookie ed è verificato con la firma, e i percorsi esca, che
        // devono registrare anche i POST degli scanner.
        $middleware->validateCsrfTokens(except: [
            'api/stripe/webhook',
            ...HoneypotController::csrfExcept(),
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Registra nel log di sicurezza i segnali di tentativi di abuso.
        // Restituendo null la risposta resta quella standard di Laravel.
        $exceptions->render(function (Throwable $e, Request $request) {
            // Laravel può presentare il CSRF mancante come HttpException 419
            if ($e instanceof TokenMismatchException
                || ($e instanceof HttpExceptionInterface && $e->getStatusCode() === 419)) {
                SecurityLog::record('csrf_mismatch');
            } elseif ($e instanceof ThrottleRequestsException) {
                SecurityLog::record('rate_limited');
            } elseif ($e instanceof AuthorizationException
                || ($e instanceof HttpExceptionInterface && $e->getStatusCode() === 403)) {
                SecurityLog::record('forbidden', ['message' => mb_substr($e->getMessage(), 0, 200)]);
            }

            return null;
        });
    })
    ->create();
