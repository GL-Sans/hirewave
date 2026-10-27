<?php
namespace App\Http\Controllers;

use App\Support\SecurityLog;
use Illuminate\Http\Request;

/**
 * Percorsi esca: indirizzi che solo scanner e attaccanti provano
 * (pannelli WordPress, phpMyAdmin, file .env, backup...). Nessun utente
 * normale ci arriva, quindi chi li visita viene registrato e bloccato.
 */
class HoneypotController extends Controller
{
    public const PATHS = [
        '.env', '.env.backup', '.env.local', '.env.production', '.git/config', '.git/HEAD',
        'wp-login.php', 'wp-admin', 'wp-admin/{any?}', 'xmlrpc.php', 'wp-config.php', 'wp-content/{any?}',
        'phpmyadmin', 'phpmyadmin/{any?}', 'pma', 'adminer.php', 'mysql',
        'admin.php', 'administrator', 'config.php', 'configuration.php', 'setup.php', 'install.php',
        'backup.sql', 'database.sql', 'dump.sql', 'db.sql', 'backup.zip',
        'server-status', 'telescope', 'horizon', '_ignition/execute-solution',
        'vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php', 'cgi-bin/{any?}', 'shell.php', 'cmd.php',
        'api/admin', 'api/debug', 'api/v1/users', 'api/users',
    ];

    // Percorsi in forma di pattern per l'esclusione dal CSRF ({any?} → *)
    public static function csrfExcept(): array
    {
        return array_values(array_unique(array_map(
            fn ($p) => str_replace('/{any?}', '*', $p),
            self::PATHS
        )));
    }

    public function __invoke(Request $request)
    {
        // Dati inviati (es. credenziali provate su wp-login): campi del modulo
        // oppure corpo grezzo, troncati per non salvare file enormi
        $body = null;
        if (!$request->isMethod('get')) {
            $body = $request->post()
                ? mb_substr(json_encode($request->post(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 0, 2000)
                : mb_substr((string) $request->getContent(), 0, 2000);
        }

        SecurityLog::record('honeypot_path', [
            'query' => $request->query() ?: null,
            'body' => $body ?: null,
            'forwarded_for' => $request->headers->get('x-forwarded-for'),
        ]);

        // Risposta identica a una pagina inesistente: l'attaccante non capisce di essere stato visto
        return response()->json(['message' => 'Not Found'], 404);
    }
}
