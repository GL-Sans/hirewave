<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Candidature dei talenti agli annunci delle aziende
        Schema::create('candidature', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['post_id', 'user_id']);
            $table->index(['user_id', 'created_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            // Disponibilità (periodo e zona): visibile prima dello sblocco
            $table->date('disponibilita_da')->nullable()->after('available');
            $table->date('disponibilita_a')->nullable()->after('disponibilita_da');
            $table->string('zona', 120)->nullable()->after('disponibilita_a');
            // Istituto e anno del titolo: visibili solo dopo lo sblocco
            $table->string('istituto', 150)->nullable()->after('livello_istruzione');
            $table->unsignedSmallInteger('anno_titolo')->nullable()->after('istituto');
            // Percorso di onboarding: "stagionale" (rapido) o "certificato"
            $table->string('percorso', 20)->default('certificato')->after('onboarding_completato');
            // Sblocchi gratuiti del lancio alpha già usati dall'azienda
            $table->unsignedSmallInteger('sblocchi_gratuiti_usati')->default(0)->after('abbonamento_scade_at');
        });

        // GDPR: consenso esplicito per ogni upload e file cifrati sul disco
        Schema::table('documenti_verifica', function (Blueprint $table) {
            $table->timestamp('consenso_at')->nullable()->after('hash');
            $table->boolean('cifrato')->default(false)->after('consenso_at');
        });
    }

    public function down(): void
    {
        Schema::table('documenti_verifica', function (Blueprint $table) {
            $table->dropColumn(['consenso_at', 'cifrato']);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['disponibilita_da', 'disponibilita_a', 'zona', 'istituto', 'anno_titolo', 'percorso', 'sblocchi_gratuiti_usati']);
        });
        Schema::dropIfExists('candidature');
    }
};
