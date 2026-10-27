<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Header di sicurezza su tutte le risposte del backend
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $headers = [
            // Il browser non "indovina" il tipo dei file (es. un upload trattato come script)
            'X-Content-Type-Options' => 'nosniff',
            // Nessuna pagina del backend dentro iframe altrui (clickjacking)
            'X-Frame-Options' => 'DENY',
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            'Permissions-Policy' => 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
            'Cross-Origin-Opener-Policy' => 'same-origin',
            // Le risposte API sono dati, mai pagine eseguibili
            'Content-Security-Policy' => "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
        ];

        // I file caricati (immagini) vanno mostrati dal frontend: niente CSP restrittiva
        if ($request->is('storage/*')) {
            unset($headers['Content-Security-Policy']);
            $headers['Cross-Origin-Resource-Policy'] = 'same-site';
        }

        // HSTS solo su HTTPS (in locale su http sarebbe ignorato o dannoso)
        if ($request->isSecure()) {
            $headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
        }

        foreach ($headers as $name => $value) {
            $response->headers->set($name, $value, false);
        }

        // Le API con dati personali non vanno salvate nella cache del browser o dei proxy
        if ($request->is('api/*')) {
            $response->headers->set('Cache-Control', 'no-store, private');
        }

        // Non rivelare la tecnologia del server
        $response->headers->remove('X-Powered-By');

        return $response;
    }
}
