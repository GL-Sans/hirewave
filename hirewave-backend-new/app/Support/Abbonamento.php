<?php
namespace App\Support;

use App\Models\User;
use App\Notifications\HireWaveNotification;

/**
 * Piani dei lavoratori e professionisti (business plan, par. 8.1).
 *
 * - Free: tutor e candidature con un limite
 * - Premium €14,99/mese o €149,99/anno: profilo in evidenza, priorità nei
 *   risultati, analisi della retribuzione avanzata, tutor e candidature illimitati
 * - Boost €29,99/mese: tutto il Premium + primo posto nei risultati e badge "Sponsor"
 */
class Abbonamento
{
    public const DURATA_GIORNI = 30;
    public const TUTOR_FREE_AL_GIORNO = 15;
    public const CANDIDATURE_FREE_AL_MESE = 10;

    // Prodotto acquistabile → piano attivato ("premium" o "boost") e durata
    public const PIANI = [
        'premium' => ['nome' => 'Premium', 'prezzo' => 1499, 'piano' => 'premium', 'giorni' => 30],
        'premium_annuale' => ['nome' => 'Premium annuale', 'prezzo' => 14999, 'piano' => 'premium', 'giorni' => 365],
        'boost' => ['nome' => 'Boost', 'prezzo' => 2999, 'piano' => 'boost', 'giorni' => 30],
    ];

    /** Piano attivo: "premium", "boost" oppure null (Free) */
    public static function attivo(User $user): ?string
    {
        if (!$user->abbonamento || !$user->abbonamento_scade_at) {
            return null;
        }

        return now()->lt($user->abbonamento_scade_at) ? $user->abbonamento : null;
    }

    public static function isPremium(User $user): bool
    {
        return self::attivo($user) !== null;
    }

    /** Ordine nei risultati: Boost, poi Premium, poi tutti gli altri */
    public static function priorita(User $user): int
    {
        return match (self::attivo($user)) {
            'boost' => 2,
            'premium' => 1,
            default => 0,
        };
    }

    /** Attiva o rinnova un prodotto di PIANI. Cambiando piano i giorni restanti non si perdono. */
    public static function attiva(User $user, string $prodotto): void
    {
        $base = self::attivo($user) && now()->lt($user->abbonamento_scade_at) ? $user->abbonamento_scade_at : now();
        $piano = self::PIANI[$prodotto]['piano'];

        $user->forceFill([
            'abbonamento' => $piano,
            'abbonamento_scade_at' => $base->copy()->addDays(self::PIANI[$prodotto]['giorni']),
        ])->save();

        $user->notify(new HireWaveNotification(
            'abbonamento',
            'Piano ' . self::PIANI[$prodotto]['nome'] . ' attivo',
            $piano === 'boost'
                ? 'Il tuo profilo è in cima ai risultati con il badge Sponsor.'
                : 'Il tuo profilo è in evidenza, tutor e candidature sono illimitati.',
            '/abbonamenti',
        ));
    }

    public static function disattiva(User $user): void
    {
        $user->forceFill(['abbonamento' => null, 'abbonamento_scade_at' => null])->save();
    }

    /** Stato del piano da mandare al frontend */
    public static function stato(User $user): array
    {
        $piano = self::attivo($user);

        return [
            'piano' => $piano,
            'scade_at' => $piano ? $user->abbonamento_scade_at?->toIso8601String() : null,
        ];
    }
}
