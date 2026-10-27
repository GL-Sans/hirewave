<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Registro degli eventi sospetti (conservati SecurityLog::RETENTION_DAYS giorni)
        Schema::create('security_events', function (Blueprint $table) {
            $table->id();
            $table->string('type', 50)->index();
            $table->string('ip', 45)->index();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('method', 10)->nullable();
            $table->string('path', 500)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->string('referer', 500)->nullable();
            $table->string('accept_language', 200)->nullable();
            $table->json('details')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });

        Schema::create('blocked_ips', function (Blueprint $table) {
            $table->id();
            $table->string('ip', 45)->unique();
            $table->string('reason', 100);
            $table->unsignedInteger('hits')->default(0);
            $table->timestamp('blocked_until')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blocked_ips');
        Schema::dropIfExists('security_events');
    }
};
