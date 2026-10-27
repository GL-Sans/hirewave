<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * - Le aziende salvavano la dimensione in livello_istruzione: la sposta
     *   nella nuova colonna dimensione_azienda e azzera il rating tecnico,
     *   che per le aziende era calcolato come se fosse un titolo di studio.
     * - Allinea years_experience (curriculum) con anni_esperienza (onboarding).
     */
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'dimensione_azienda')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('dimensione_azienda')->nullable();
            });
        }

        $map = [
            'licenza_media' => 'micro',
            'diploma' => 'piccola',
            'laurea_triennale' => 'media',
            'laurea_magistrale' => 'grande',
        ];

        foreach ($map as $old => $new) {
            DB::table('users')
                ->where('role', 'COMPANY')
                ->where('livello_istruzione', $old)
                ->update(['dimensione_azienda' => $new]);
        }

        DB::table('users')
            ->where('role', 'COMPANY')
            ->update(['livello_istruzione' => null, 'rating_tecnico' => 0]);

        DB::table('users')
            ->where('role', '!=', 'COMPANY')
            ->whereNull('years_experience')
            ->whereNotNull('anni_esperienza')
            ->update(['years_experience' => DB::raw('anni_esperienza')]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('dimensione_azienda');
        });
    }
};
