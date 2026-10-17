<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Aggiunge alla tabella users le colonne del curriculum solo se mancano.
     * Non modifica né elimina colonne o dati esistenti.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'bio')) {
                $table->text('bio')->nullable();
            }
            if (!Schema::hasColumn('users', 'city')) {
                $table->string('city')->nullable();
            }
            if (!Schema::hasColumn('users', 'country')) {
                $table->string('country')->nullable();
            }
            if (!Schema::hasColumn('users', 'website')) {
                $table->string('website')->nullable();
            }
            if (!Schema::hasColumn('users', 'phone')) {
                $table->string('phone')->nullable();
            }
            if (!Schema::hasColumn('users', 'birth_date')) {
                $table->date('birth_date')->nullable();
            }
            if (!Schema::hasColumn('users', 'years_experience')) {
                $table->integer('years_experience')->nullable();
            }
            if (!Schema::hasColumn('users', 'contract_type')) {
                $table->string('contract_type')->nullable();
            }
            if (!Schema::hasColumn('users', 'available')) {
                $table->boolean('available')->default(true);
            }
            if (!Schema::hasColumn('users', 'curriculum_public')) {
                $table->boolean('curriculum_public')->default(false);
            }
            if (!Schema::hasColumn('users', 'skills')) {
                $table->json('skills')->nullable();
            }
            if (!Schema::hasColumn('users', 'languages')) {
                $table->json('languages')->nullable();
            }
        });
    }

    /**
     * Volutamente vuoto: non si eliminano colonne con dati.
     */
    public function down(): void
    {
        //
    }
};