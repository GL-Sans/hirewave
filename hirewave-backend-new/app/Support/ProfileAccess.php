<?php
namespace App\Support;

use App\Models\User;
use App\Notifications\HireWaveNotification;
use Illuminate\Support\Facades\DB;

/**
 * Regole uniche su chi può vedere l'identità (cognome e foto) di un utente.
 *
 * - il proprietario vede sempre se stesso
 * - i profili azienda sono sempre visibili
 * - un'azienda vede un lavoratore/professionista solo se l'ha sbloccato
 *   (lo sblocco dura UNLOCK_DAYS giorni)
 * - lavoratori e professionisti tra loro restano anonimi
 */
class ProfileAccess
{
    public const UNLOCK_DAYS = 30;

    /** Id dei profili sbloccati e non scaduti per l'azienda $viewer */
    public static function unlockedIds(User $viewer): array
    {
        if ($viewer->role !== 'COMPANY') {
            return [];
        }

        return self::activeUnlocks()
            ->where('company_id', $viewer->id)
            ->pluck('worker_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    public static function isUnlocked(int $companyId, int $workerId): bool
    {
        return self::activeUnlocks()
            ->where('company_id', $companyId)
            ->where('worker_id', $workerId)
            ->exists();
    }

    /** Scadenza dello sblocco, null se non sbloccato o scaduto */
    public static function unlockExpiresAt(int $companyId, int $workerId): ?string
    {
        $at = self::activeUnlocks()
            ->where('company_id', $companyId)
            ->where('worker_id', $workerId)
            ->value('unlocked_at');

        return $at ? now()->parse($at)->addDays(self::UNLOCK_DAYS)->toIso8601String() : null;
    }

    /** Registra (o rinnova, se scaduto) lo sblocco e avvisa il lavoratore */
    public static function unlock(int $companyId, int $workerId): void
    {
        // Conferma Stripe e webhook possono arrivare entrambi: nessun doppio sblocco/avviso
        if (self::isUnlocked($companyId, $workerId)) {
            return;
        }

        DB::table('unlocked_profiles')->updateOrInsert(
            ['company_id' => $companyId, 'worker_id' => $workerId],
            ['unlocked_at' => now()]
        );

        $company = User::find($companyId);
        User::find($workerId)?->notify(new HireWaveNotification(
            'unlock',
            'Un\'azienda ha sbloccato il tuo profilo',
            "{$company->first_name} {$company->last_name} ora può vedere i tuoi contatti e scriverti.",
            "/profile/{$company->id}",
        ));
    }

    /** $unlockedIds evita una query per ogni riga negli elenchi */
    public static function canSeeIdentity(User $viewer, User $owner, ?array $unlockedIds = null): bool
    {
        if ($viewer->id === $owner->id || $owner->role === 'COMPANY') {
            return true;
        }

        if ($viewer->role !== 'COMPANY') {
            return false;
        }

        return $unlockedIds !== null
            ? in_array($owner->id, $unlockedIds, true)
            : self::isUnlocked($viewer->id, $owner->id);
    }

    /** Dati base dell'autore/contatto, con cognome e foto solo se visibili */
    public static function present(User $viewer, User $owner, ?array $unlockedIds = null): array
    {
        $visible = self::canSeeIdentity($viewer, $owner, $unlockedIds);

        return [
            'id' => $owner->id,
            'first_name' => $owner->first_name,
            'last_name' => $visible ? $owner->last_name : null,
            'role' => $owner->role,
            'profile_image' => $visible ? $owner->profile_image : null,
            'badge' => $owner->badge,
            // Il settore non identifica la persona: serve ai filtri del feed
            'settore' => $owner->settore,
        ];
    }

    private static function activeUnlocks()
    {
        return DB::table('unlocked_profiles')
            ->where('unlocked_at', '>=', now()->subDays(self::UNLOCK_DAYS));
    }
}
