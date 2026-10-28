<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Rating tecnico v2:
     * - documenti caricati per verificare istruzione, esperienza e certificazioni
     * - storico delle variazioni del rating, con il motivo
     * - certificazioni come testo lungo (la validazione accettava 500 caratteri su una colonna da 255)
     * - amministratori, per la revisione manuale dei casi ambigui
     */
    public function up(): void
    {
        Schema::create('documenti_verifica', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('tipo', ['istruzione', 'esperienza', 'certificazione']);
            // istruzione: livello · certificazione: nome · esperienza: ruolo/azienda
            $table->string('riferimento', 255)->nullable();
            $table->unsignedSmallInteger('anni')->nullable();
            $table->unsignedSmallInteger('anno')->nullable();
            $table->string('file_path');
            $table->string('nome_file', 255);
            $table->string('mime', 100);
            $table->unsignedInteger('dimensione');
            $table->enum('stato', ['in_verifica', 'verificato', 'rifiutato', 'revisione_manuale'])->default('in_verifica');
            $table->text('esito')->nullable();
            $table->foreignId('revisionato_da')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verificato_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'tipo', 'stato']);
        });

        Schema::create('rating_storico', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('valore_precedente');
            $table->unsignedTinyInteger('valore');
            $table->string('motivo', 255);
            $table->timestamp('created_at')->useCurrent();
            $table->index(['user_id', 'created_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->text('certificazioni')->nullable()->change();
            $table->boolean('is_admin')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_admin');
            $table->string('certificazioni')->nullable()->change();
        });
        Schema::dropIfExists('rating_storico');
        Schema::dropIfExists('documenti_verifica');
    }
};
