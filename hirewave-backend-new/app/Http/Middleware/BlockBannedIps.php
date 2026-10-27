<?php
namespace App\Http\Middleware;

use App\Support\SecurityLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Rifiuta subito le richieste degli IP bloccati da SecurityLog
class BlockBannedIps
{
    public function handle(Request $request, Closure $next): Response
    {
        $ip = $request->ip();

        if ($ip && SecurityLog::isBlocked($ip)) {
            // Risposta generica: nessuna informazione su motivo o durata
            return response()->json(['message' => 'Accesso temporaneamente non consentito.'], 403);
        }

        return $next($request);
    }
}
