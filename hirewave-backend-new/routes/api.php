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
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\ConnectionController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\DocumentoController;
use App\Http\Controllers\Api\AdminDocumentoController;
use App\Http\Controllers\Api\TutorController;
use App\Http\Controllers\Api\CandidaturaController;
use App\Http\Middleware\EnsureAdmin;

// I limiti (throttle:...) sono definiti in AppServiceProvider::configureRateLimits

// Webhook Stripe — FUORI da auth, Stripe non manda cookie (verificato con la firma)
Route::post('/stripe/webhook', [StripeController::class, 'webhook'])->middleware('throttle:payments');

// Accesso e registrazione
Route::middleware(['web', 'guest', 'throttle:auth'])->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
});

// Login e registrazione social (Google, LinkedIn)
Route::middleware(['web', 'throttle:social'])->group(function () {
    Route::get('/auth/{provider}/redirect', [SocialAuthController::class, 'redirect'])
        ->where('provider', 'google|linkedin');
    Route::get('/auth/{provider}/callback', [SocialAuthController::class, 'callback'])
        ->where('provider', 'google|linkedin');
    Route::post('/auth/social/complete', [SocialAuthController::class, 'complete']);
});

// Rotte protette
Route::middleware(['web', 'auth:sanctum', 'throttle:api'])->group(function () {
    // Lettura
    Route::get('/feed', [FeedController::class, 'index']);
    Route::get('/me', [ProfileController::class, 'show']);
    Route::get('/me/cv/download', [ProfileController::class, 'downloadCv']);
    Route::get('/talents', [UserController::class, 'talents']);
    Route::get('/companies', [UserController::class, 'companies']);
    Route::get('/profile/{name}', [PublicProfileController::class, 'show']);
    Route::get('/profiles/{id}/posts', [PublicProfileController::class, 'posts'])->whereNumber('id');
    Route::get('/profiles/{id}/reviews', [ReviewController::class, 'index'])->whereNumber('id');
    // CV di un profilo sbloccato
    Route::get('/profiles/{id}/cv', [ProfileController::class, 'downloadCvDi'])->whereNumber('id');
    Route::get('/me/candidature', [CandidaturaController::class, 'index']);
    Route::get('/conversations', [MessageController::class, 'conversations']);
    Route::get('/messages/{user}', [MessageController::class, 'index'])->whereNumber('user');
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/read-all', [NotificationController::class, 'readAll']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'read'])->whereUuid('id');
    Route::post('/logout', [AuthController::class, 'logout']);

    // Messaggi
    Route::post('/messages/{user}', [MessageController::class, 'store'])
        ->whereNumber('user')->middleware('throttle:messages');

    // Tutor (chat di aiuto)
    Route::get('/tutor', [TutorController::class, 'index']);
    Route::post('/tutor', [TutorController::class, 'store'])->middleware('throttle:messages');

    // Caricamento file
    Route::middleware('throttle:uploads')->group(function () {
        Route::post('/me/image', [ProfileController::class, 'uploadImage']);
        Route::post('/me/cv', [ProfileController::class, 'uploadCv']);
        Route::post('/posts', [PostController::class, 'store']);
        // La modifica usa POST perché può contenere un'immagine (multipart)
        Route::post('/posts/{post}', [PostController::class, 'update'])->whereNumber('post');
        // Documenti di verifica (titolo, esperienza, certificazioni)
        Route::post('/me/documenti', [DocumentoController::class, 'store']);
    });

    Route::get('/me/documenti', [DocumentoController::class, 'index']);
    Route::get('/documenti/{documento}/file', [DocumentoController::class, 'download'])->whereNumber('documento');
    Route::delete('/me/documenti/{documento}', [DocumentoController::class, 'destroy'])
        ->whereNumber('documento')->middleware('throttle:writes');

    // Revisione manuale dei documenti ambigui
    Route::middleware(EnsureAdmin::class)->prefix('admin')->group(function () {
        Route::get('/documenti', [AdminDocumentoController::class, 'index']);
        Route::post('/documenti/{documento}/esito', [AdminDocumentoController::class, 'esito'])
            ->whereNumber('documento')->middleware('throttle:writes');
    });

    // Pubblicazioni e interazioni
    Route::middleware('throttle:writes')->group(function () {
        Route::put('/me/curriculum', [CurriculumController::class, 'update']);
        Route::put('/me/description', [ProfileController::class, 'updateDescription']);
        Route::put('/me/preferences', [AccountController::class, 'updatePreferences']);
        Route::post('/onboarding', [OnboardingController::class, 'submit']);
        Route::post('/profiles/{id}/reviews', [ReviewController::class, 'store'])->whereNumber('id');
        Route::delete('/posts/{post}', [PostController::class, 'destroy'])->whereNumber('post');
        Route::post('/posts/{post}/hide', [PostController::class, 'hide'])->whereNumber('post');
        Route::delete('/posts/{post}/hide', [PostController::class, 'unhide'])->whereNumber('post');
        Route::post('/posts/{post}/report', [PostController::class, 'report'])->whereNumber('post');
        Route::post('/posts/{post}/candidatura', [CandidaturaController::class, 'store'])->whereNumber('post');
        Route::delete('/posts/{post}/candidatura', [CandidaturaController::class, 'destroy'])->whereNumber('post');
        Route::post('/saved/{user}', [ConnectionController::class, 'toggleSave'])->whereNumber('user');
        Route::post('/follow/{user}', [ConnectionController::class, 'toggleFollow'])->whereNumber('user');
    });

    // Pagamenti
    Route::middleware('throttle:payments')->group(function () {
        Route::post('/stripe/checkout', [StripeController::class, 'createCheckout']);
        Route::post('/stripe/confirm', [StripeController::class, 'confirm']);
        // Abbonamenti Premium e Boost dei lavoratori
        Route::post('/abbonamento', [StripeController::class, 'checkoutAbbonamento']);
        Route::delete('/abbonamento', [StripeController::class, 'disdiciAbbonamento']);
    });

    // Azioni delicate
    Route::middleware('throttle:sensitive')->group(function () {
        Route::put('/me/password', [AccountController::class, 'updatePassword']);
        Route::get('/me/export', [AccountController::class, 'export']);
        Route::delete('/me', [AccountController::class, 'destroy']);
    });
});
