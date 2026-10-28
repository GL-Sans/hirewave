<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Piano del lavoratore: null = Free, "premium" o "boost" fino alla scadenza
        Schema::table('users', function (Blueprint $table) {
            $table->string('abbonamento', 20)->nullable()->after('badge');
            $table->timestamp('abbonamento_scade_at')->nullable()->after('abbonamento');
        });

        // Conversazione con il tutor: storico e limite giornaliero del piano Free
        Schema::create('tutor_messaggi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('autore', 10); // utente | tutor
            $table->text('testo');
            $table->json('azioni')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });

        // Sessioni Stripe già usate: un abbonamento si attiva una volta sola
        // anche se arrivano sia la conferma sia il webhook
        Schema::create('pagamenti_elaborati', function (Blueprint $table) {
            $table->string('session_id')->primary();
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pagamenti_elaborati');
        Schema::dropIfExists('tutor_messaggi');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['abbonamento', 'abbonamento_scade_at']);
        });
    }
};
