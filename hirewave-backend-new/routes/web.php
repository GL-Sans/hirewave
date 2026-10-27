<?php

use App\Http\Controllers\HoneypotController;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    // Questa route esiste solo per evitare l'errore Route [login] not defined.
    // Nella pratica la tua SPA React gestirà il login su http://localhost:5173/.
    return response()->json([
        'message' => 'Login gestito dalla SPA frontend.'
    ]);
})->name('login');

// Percorsi esca (vedi HoneypotController): registrano e bloccano chi li visita.
// Senza CSRF, così vengono registrati anche i POST degli scanner.
foreach (HoneypotController::PATHS as $path) {
    Route::any($path, HoneypotController::class)
        ->where('any', '.*')
        ->withoutMiddleware(ValidateCsrfToken::class);
}
