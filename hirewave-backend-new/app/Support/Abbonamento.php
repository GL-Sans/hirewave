<?php
namespace App\Support;

use App\Models\User;
use App\Notifications\HireWaveNotification;

/**
 * Piani dei lavoratori e professionisti (business plan, par. 8.1).
 *
 * - Free: tutor con domande limitate al giorno
 * - Premium €14,99/mese: profilo in evidenza, priorità nei risultati,
 *   analisi della retribuzione avanzata, tutor illimitato
 * - Boost €29,99/mese: tutto il Premium + primo posto nei risultati e badge "Sponsor"
 */
class Abbonamento
{
    public const DURATA_GIORNI = 30;
    public const TUTOR_FREE_AL_GIORNO = 15;

    public const PIANI = [
        'premium' => ['nome' => 'Premium', 'prezzo' => 1499],
        'boost' => ['nome' => 'Boost', 'prezzo' => 2999],
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

    /** Attiva o rinnova per 30 giorni. Passando da Premium a Boost i giorni restanti non si perdono. */
    public static function attiva(User $user, string $piano): void
    {
        $base = self::attivo($user) && now()->lt($user->abbonamento_scade_at) ? $user->abbonamento_scade_at : now();

        $user->forceFill([
            'abbonamento' => $piano,
            'abbonamento_scade_at' => $base->copy()->addDays(self::DURATA_GIORNI),
        ])->save();

        $user->notify(new HireWaveNotification(
            'abbonamento',
            'Piano ' . self::PIANI[$piano]['nome'] . ' attivo',
            $piano === 'boost'
                ? 'Il tuo profilo è in cima ai risultati con il badge Sponsor.'
                : 'Il tuo profilo è in evidenza e il tutor è illimitato.',
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
