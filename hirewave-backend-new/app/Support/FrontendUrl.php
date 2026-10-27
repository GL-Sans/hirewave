<?php
namespace App\Support;

use Illuminate\Http\Request;

/**
 * Indirizzo del frontend da cui arriva la richiesta (localhost, IP di rete
 * locale o tunnel HTTPS), così i redirect di OAuth e Stripe tornano sullo
 * stesso indirizzo aperto dall'utente invece che sempre su FRONTEND_URL.
 */
class FrontendUrl
{
    public static function resolve(Request $request): string
    {
        $default = rtrim(config('services.frontend.url'), '/');

        // Il proxy di Vite inoltra l'host originale in X-Forwarded-Host
        $host = $request->header('X-Forwarded-Host');
        if (!$host) {
            return $default;
        }

        $host = trim(explode(',', $host)[0]);
        $proto = trim(explode(',', (string) $request->header('X-Forwarded-Proto', 'http'))[0]);
        $proto = in_array($proto, ['http', 'https'], true) ? $proto : 'http';
        $origin = $proto . '://' . $host;

        return self::isAllowed($origin) ? $origin : $default;
    }

    private static function isAllowed(string $origin): bool
    {
        $allowed = array_filter(array_map(
            fn ($u) => rtrim(trim($u), '/'),
            array_merge(
                [config('services.frontend.url')],
                explode(',', (string) config('services.frontend.extra_urls'))
            )
        ));

        if (in_array($origin, $allowed, true)) {
            return true;
        }

        // In locale accetta anche gli IP della rete di casa (telefono in Wi-Fi)
        if (app()->environment('local')) {
            $hostname = parse_url($origin, PHP_URL_HOST);
            return $hostname === 'localhost'
                || (filter_var($hostname, FILTER_VALIDATE_IP)
                    && !filter_var($hostname, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE));
        }

        return false;
    }
}
