<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * - impronta del file: lo stesso documento caricato da due persone va in revisione
     * - "Verifica Premium" (€9,99): l'azienda vede i documenti originali di un profilo
     */
    public function up(): void
    {
        Schema::table('documenti_verifica', function (Blueprint $table) {
            $table->char('hash', 64)->nullable()->index()->after('dimensione');
        });

        Schema::create('accessi_documenti', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('worker_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('acquistato_at');
            $table->unique(['company_id', 'worker_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accessi_documenti');
        Schema::table('documenti_verifica', function (Blueprint $table) {
            $table->dropColumn('hash');
        });
    }
};
