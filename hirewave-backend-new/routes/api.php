<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\FeedController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\Api\PublicProfileController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\CurriculumController;

// Rotte pubbliche con rate limiting stretto
Route::middleware(['web', 'guest', 'throttle:10,1'])->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
});

// Rotte protette con rate limiting normale
Route::middleware(['web', 'auth:sanctum', 'throttle:60,1'])->group(function () {
    Route::get('/feed', [FeedController::class, 'index']);
    Route::get('/me', [ProfileController::class, 'show']);
    Route::post('/me/image', [ProfileController::class, 'uploadImage']);
    Route::put('/me/curriculum', [CurriculumController::class, 'update']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/talents', [UserController::class, 'talents']);
    Route::get('/companies', [UserController::class, 'companies']);
    Route::get('/profile/{name}', [PublicProfileController::class, 'show']);
    Route::post('/posts', [PostController::class, 'store']);
});