<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('settore')->nullable();
            $table->string('ral_aspettativa')->nullable();
            $table->string('livello_istruzione')->nullable();
            $table->integer('anni_esperienza')->nullable();
            $table->string('certificazioni')->nullable();
            $table->integer('rating_tecnico')->default(0);
            $table->enum('badge', ['none', 'grigio', 'verde'])->default('none');
            $table->boolean('onboarding_completato')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'settore', 'ral_aspettativa', 'livello_istruzione',
                'anni_esperienza', 'certificazioni', 'rating_tecnico',
                'badge', 'onboarding_completato'
            ]);
        });
    }
};