<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * I post delle aziende venivano salvati come 'service' per un controllo
     * sul ruolo in minuscolo: li riporta a 'job'.
     */
    public function up(): void
    {
        DB::table('posts')
            ->whereIn('user_id', DB::table('users')->where('role', 'COMPANY')->select('id'))
            ->update(['type' => 'job']);
    }

    public function down(): void
    {
        //
    }
};
