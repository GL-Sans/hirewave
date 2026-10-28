<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Il codice confronta i ruoli in maiuscolo (WORKER, PRO, COMPANY), ma la prima
 * migration li creava in minuscolo. Il database di sviluppo era già stato
 * corretto a mano: qui lo schema si allinea ovunque (sul database corretto non
 * cambia nulla). In MySQL gli enum non distinguono maiuscole e minuscole, quindi
 * i valori esistenti restano validi.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql' || !Schema::hasColumn('users', 'role')) {
            return;
        }

        DB::statement("ALTER TABLE users MODIFY role ENUM('WORKER','PRO','COMPANY') NOT NULL DEFAULT 'WORKER'");
    }

    public function down(): void
    {
        // Nessun ritorno al minuscolo: romperebbe i confronti nel codice
    }
};
