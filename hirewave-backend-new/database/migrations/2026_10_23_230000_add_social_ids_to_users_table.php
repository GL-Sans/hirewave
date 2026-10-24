<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Aggiunge gli id dei provider social alla tabella users, solo se mancano.
     * Non modifica né elimina colonne o dati esistenti.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'google_id')) {
                $table->string('google_id')->nullable()->unique();
            }
            if (!Schema::hasColumn('users', 'linkedin_id')) {
                $table->string('linkedin_id')->nullable()->unique();
            }
        });
    }

    /**
     * Volutamente vuoto: non si eliminano colonne con dati.
     */
    public function down(): void
    {
        //
    }
};