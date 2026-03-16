<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    // Questa route esiste solo per evitare l'errore Route [login] not defined.
    // Nella pratica la tua SPA React gestirà il login su http://localhost:5173/.
    return response()->json([
        'message' => 'Login gestito dalla SPA frontend.'
    ]);
})->name('login');
