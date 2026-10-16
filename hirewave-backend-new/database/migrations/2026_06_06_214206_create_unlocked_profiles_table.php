<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unlocked_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('users');
            $table->foreignId('worker_id')->constrained('users');
            $table->timestamp('unlocked_at');
            $table->unique(['company_id', 'worker_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unlocked_profiles');
    }
};