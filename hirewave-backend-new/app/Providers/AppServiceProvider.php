<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Regole minime delle password (registrazione e cambio password)
        Password::defaults(fn () => Password::min(8)->max(128)->letters()->numbers());

        $this->configureRateLimits();

        // In produzione APP_DEBUG mostrerebbe codice, query e dati negli errori
        if ($this->app->environment('production') && config('app.debug')) {
            logger()->critical('APP_DEBUG è attivo in produzione: impostare APP_DEBUG=false');
        }
    }

    /**
     * Limiti di frequenza per tipo di azione (per utente se loggato, altrimenti per IP).
     * Superarli dà errore 429 e viene registrato nel log di sicurezza.
     */
    private function configureRateLimits(): void
    {
        $key = fn (Request $request) => $request->user()?->id ?: $request->ip();

        // Navigazione generale: chat e notifiche si aggiornano da sole ogni pochi secondi
        RateLimiter::for('api', fn (Request $r) => Limit::perMinute(180)->by($key($r)));

        // Accesso e registrazione: per IP (il blocco per singolo account è in AuthController)
        RateLimiter::for('auth', fn (Request $r) => Limit::perMinute(10)->by($r->ip()));

        // Login social
        RateLimiter::for('social', fn (Request $r) => Limit::perMinute(20)->by($r->ip()));

        // Messaggi in chat: abbastanza per una conversazione, non per lo spam
        RateLimiter::for('messages', fn (Request $r) => [
            Limit::perMinute(30)->by($key($r)),
            Limit::perHour(300)->by($key($r)),
        ]);

        // Pubblicazioni e interazioni (post, recensioni, segnalazioni, salva, segui)
        RateLimiter::for('writes', fn (Request $r) => [
            Limit::perMinute(20)->by($key($r)),
            Limit::perHour(200)->by($key($r)),
        ]);

        // Caricamento di file
        RateLimiter::for('uploads', fn (Request $r) => [
            Limit::perMinute(10)->by($key($r)),
            Limit::perHour(60)->by($key($r)),
        ]);

        // Azioni delicate: password, export dati, eliminazione account
        RateLimiter::for('sensitive', fn (Request $r) => Limit::perMinute(5)->by($key($r)));

        // Pagamenti
        RateLimiter::for('payments', fn (Request $r) => Limit::perMinute(10)->by($key($r)));
    }
}
