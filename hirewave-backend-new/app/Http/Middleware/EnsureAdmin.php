<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

// Area di revisione: 404 e non 403, per non rivelare che l'indirizzo esiste
class EnsureAdmin
{
    public function handle(Request $request, Closure $next)
    {
        abort_unless($request->user()?->is_admin, 404);

        return $next($request);
    }
}
