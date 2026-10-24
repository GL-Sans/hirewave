<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\FeedController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\Api\PublicProfileController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\CurriculumController;
use App\Http\Controllers\Api\StripeController;
use App\Http\Controllers\Api\SocialAuthController;

// Webhook Stripe — FUORI da auth, Stripe non manda cookie
Route::post('/stripe/webhook', [StripeController::class, 'webhook']);

// Rotte pubbliche con rate limiting stretto
Route::middleware(['web', 'guest', 'throttle:10,1'])->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
});

// Login e registrazione social (Google, LinkedIn)
Route::middleware(['web', 'throttle:20,1'])->group(function () {
    Route::get('/auth/{provider}/redirect', [SocialAuthController::class, 'redirect'])
        ->where('provider', 'google|linkedin');
    Route::get('/auth/{provider}/callback', [SocialAuthController::class, 'callback'])
        ->where('provider', 'google|linkedin');
    Route::post('/auth/social/complete', [SocialAuthController::class, 'complete']);
});

// Rotte protette con rate limiting normale
Route::middleware(['web', 'auth:sanctum', 'throttle:60,1'])->group(function () {
    Route::get('/feed', [FeedController::class, 'index']);
    Route::get('/me', [ProfileController::class, 'show']);
    Route::post('/me/image', [ProfileController::class, 'uploadImage']);
    Route::put('/me/curriculum', [CurriculumController::class, 'update']);
    Route::post('/me/cv', [ProfileController::class, 'uploadCv']);
    Route::get('/me/cv/download', [ProfileController::class, 'downloadCv']);
    Route::put('/me/description', [ProfileController::class, 'updateDescription']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/talents', [UserController::class, 'talents']);
    Route::get('/companies', [UserController::class, 'companies']);
    Route::get('/profile/{name}', [PublicProfileController::class, 'show']);
    Route::get('/profiles/{id}/posts', [PublicProfileController::class, 'posts']);
    Route::post('/posts', [PostController::class, 'store']);
    Route::post('/onboarding', [App\Http\Controllers\Api\OnboardingController::class, 'submit']);
    Route::post('/stripe/checkout', [StripeController::class, 'createCheckout']);
    Route::get('/profiles/{id}/reviews', [App\Http\Controllers\Api\ReviewController::class, 'index']);
    Route::post('/profiles/{id}/reviews', [App\Http\Controllers\Api\ReviewController::class, 'store']);
});