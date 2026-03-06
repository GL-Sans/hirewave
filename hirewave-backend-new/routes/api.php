<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\FeedController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\Api\PublicProfileController;
use App\Http\Controllers\Api\PostController;

Route::middleware('guest')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/feed', [FeedController::class, 'index']);
    Route::get('/me', [ProfileController::class, 'show']);
    Route::post('/me/image', [ProfileController::class, 'uploadImage']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/talents', [UserController::class, 'talents']);
    Route::get('/companies', [UserController::class, 'companies']);
    Route::get('/profiles/{id}', [PublicProfileController::class, 'show']);
    Route::post('/posts', [PostController::class, 'store']);
});
