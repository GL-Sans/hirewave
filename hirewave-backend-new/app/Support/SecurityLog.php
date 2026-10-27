<?php
namespace App\Support;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Registro di sicurezza e blocco automatico degli IP.
 *
 * Salva solo ciò che arriva con la richiesta (IP, metodo, percorso, browser,
 * referer, lingua) più dettagli dell'evento. I dati restano RETENTION_DAYS
 * giorni (GDPR: legittimo interesse alla sicurezza, conservazione limitata).
 */
class SecurityLog
{
    public const RETENTION_DAYS = 90;

    /**
     * Soglie di blocco: [eventi nella finestra, minuti di finestra, minuti di blocco].
     * Le trappole bloccano subito: nessun utente normale ci arriva.
     */
    private const RULES = [
        'honeypot_path'     => [1, 60, 24 * 60],
        'honeypot_form'     => [1, 60, 24 * 60],
        'login_failed'      => [20, 60, 60],
        'login_locked'      => [3, 60, 120],
        'forbidden'         => [30, 60, 60],
        'csrf_mismatch'     => [30, 60, 60],
        'rate_limited'      => [20, 60, 60],
        'stripe_webhook_rejected' => [20, 60, 60],
    ];

    public static function record(string $type, array $details = []): void
    {
        $request = request();
        $ip = $request->ip() ?? 'sconosciuto';

        try {
            DB::table('security_events')->insert([
                'type' => $type,
                'ip' => $ip,
                'user_id' => Auth::id(),
                'method' => $request->method(),
                'path' => Str::limit($request->getRequestUri(), 497),
                'user_agent' => Str::limit((string) $request->userAgent(), 497),
                'referer' => Str::limit((string) $request->headers->get('referer'), 497),
                'accept_language' => Str::limit((string) $request->headers->get('accept-language'), 197),
                'details' => $details ? json_encode($details, JSON_UNESCAPED_UNICODE) : null,
                'created_at' => now(),
            ]);

            self::maybeBlock($type, $ip);

            // Pulizia periodica senza bisogno di cron (circa 1 richiesta su 100)
            if (random_int(1, 100) === 1) {
                self::prune();
            }
        } catch (\Throwable $e) {
            // Il registro non deve mai rompere la richiesta dell'utente
            report($e);
        }
    }

    public static function isBlocked(string $ip): bool
    {
        return DB::table('blocked_ips')
            ->where('ip', $ip)
            ->where('blocked_until', '>', now())
            ->exists();
    }

    public static function block(string $ip, string $reason, int $minutes): void
    {
        if (self::isNeverBlocked($ip)) {
            return;
        }

        $existing = DB::table('blocked_ips')->where('ip', $ip)->first();
        $until = now()->addMinutes($minutes);

        if ($existing) {
            DB::table('blocked_ips')->where('ip', $ip)->update([
                'reason' => $reason,
                'hits' => $existing->hits + 1,
                // Un blocco più lungo già attivo non viene accorciato
                'blocked_until' => max($until, now()->parse($existing->blocked_until)),
                'updated_at' => now(),
            ]);
        } else {
            DB::table('blocked_ips')->insert([
                'ip' => $ip,
                'reason' => $reason,
                'hits' => 1,
                'blocked_until' => $until,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public static function unblock(string $ip): bool
    {
        return DB::table('blocked_ips')->where('ip', $ip)->delete() > 0;
    }

    public static function prune(): void
    {
        $limit = now()->subDays(self::RETENTION_DAYS);
        DB::table('security_events')->where('created_at', '<', $limit)->delete();
        DB::table('blocked_ips')->where('blocked_until', '<', $limit)->delete();
    }

    private static function maybeBlock(string $type, string $ip): void
    {
        if (!isset(self::RULES[$type])) {
            return;
        }

        [$threshold, $windowMinutes, $blockMinutes] = self::RULES[$type];

        $count = DB::table('security_events')
            ->where('ip', $ip)
            ->where('type', $type)
            ->where('created_at', '>=', now()->subMinutes($windowMinutes))
            ->count();

        if ($count >= $threshold) {
            self::block($ip, $type, $blockMinutes);
        }
    }

    // La macchina di sviluppo non si blocca da sola (127.0.0.1 / ::1)
    private static function isNeverBlocked(string $ip): bool
    {
        return in_array($ip, ['127.0.0.1', '::1'], true);
    }
}
