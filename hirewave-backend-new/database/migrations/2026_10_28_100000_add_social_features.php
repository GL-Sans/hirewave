<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Preferenza dalla pagina Impostazioni
            $table->boolean('notifications_enabled')->default(true);
            // false per gli account creati con Google/LinkedIn (password casuale):
            // possono impostarne una senza conoscere quella attuale
            $table->boolean('has_password')->default(true);
        });

        DB::table('users')
            ->where(fn ($q) => $q->whereNotNull('google_id')->orWhereNotNull('linkedin_id'))
            ->update(['has_password' => false]);

        // "Non mi interessa": post nascosti dal feed di un utente
        Schema::create('hidden_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'post_id']);
        });

        Schema::create('post_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->string('reason');
            $table->text('details')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'post_id']);
        });

        // Profili salvati (segnalibro sulle card)
        Schema::create('saved_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('saved_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'saved_user_id']);
        });

        // Aziende seguite: si ricevono notifiche sui loro nuovi annunci
        Schema::create('company_follows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'company_id']);
        });

        // Tabella standard delle notifiche database di Laravel
        if (!Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('type');
                $table->morphs('notifiable');
                $table->text('data');
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('company_follows');
        Schema::dropIfExists('saved_profiles');
        Schema::dropIfExists('post_reports');
        Schema::dropIfExists('hidden_posts');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['notifications_enabled', 'has_password']);
        });
    }
};
