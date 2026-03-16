<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();

            // Autore del post
            $table->foreignId('user_id')
                ->constrained()
                ->onDelete('cascade');

            // Tipo di contenuto nel feed
            $table->enum('type', ['job', 'service']);

            // Contenuto principale
            $table->string('title');
            $table->text('description')->nullable();

            // Metadata utili per il feed
            $table->string('location')->nullable();
            $table->boolean('sponsored')->default(false);

            // Informazioni economiche / contrattuali
            $table->string('contract_type')->nullable();
            $table->string('budget')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
