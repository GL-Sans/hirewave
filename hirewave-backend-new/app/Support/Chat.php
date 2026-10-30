<?php
namespace App\Support;

use App\Models\User;

/**
 * Regole della chat (business plan, par. 5.1 e 5.3).
 *
 * - Chat libera solo tra due utenti con uno sblocco attivo (in un senso o
 *   nell'altro): la apre il pagamento di un'azienda o di un professionista.
 * - Senza sblocco solo messaggi preimpostati: abbastanza per manifestare
 *   interesse, non per scambiarsi contatti.
 * - Niente chat tra pari (lavoratore↔lavoratore, professionista↔professionista,
 *   azienda↔azienda): nessuno dei due può sbloccare l'altro, quindi resterebbe
 *   per sempre uno scambio di frasi fatte senza senso.
 */
class Chat
{
    // Chi può sbloccare l'altro (azienda, o professionista verso un lavoratore)
    private const DA_CHI_SBLOCCA = [
        'interesse' => 'Il tuo profilo è interessante: sei disponibile per un colloquio?',
        'disponibilita' => 'Sei disponibile nel periodo indicato nel tuo profilo?',
        'verifica' => 'Puoi verificare i tuoi titoli con un documento? Ci aiuta a valutarti.',
        'valutazione' => 'Stiamo valutando il tuo profilo: a breve potremmo sbloccarlo per contattarti.',
    ];

    // Il talento verso chi può sbloccarlo
    private const DAL_TALENTO = [
        'interessato' => 'Grazie, sono interessato/a.',
        'disponibile' => 'Sì, sono disponibile.',
        'non_disponibile' => 'Al momento non sono disponibile.',
        'candidatura' => 'Ho inviato la candidatura al vostro annuncio.',
        'sblocca' => 'Sblocca il mio profilo per vedere contatti e curriculum completo.',
    ];

    public const MSG_TRA_PARI = 'La chat è disponibile solo tra aziende o professionisti e i talenti che possono sbloccare.';

    /** Chat possibile solo se uno dei due può sbloccare l'altro */
    public static function consentita(User $a, User $b): bool
    {
        return ProfileAccess::canUnlock($a, $b) || ProfileAccess::canUnlock($b, $a);
    }

    public static function libera(User $a, User $b): bool
    {
        return $a->id !== $b->id
            && (ProfileAccess::isUnlocked($a->id, $b->id) || ProfileAccess::isUnlocked($b->id, $a->id));
    }

    /** Messaggi preimpostati che $me può mandare a $other: [chiave => testo] */
    public static function preset(User $me, User $other): array
    {
        if (ProfileAccess::canUnlock($me, $other)) {
            return self::DA_CHI_SBLOCCA;
        }
        if (ProfileAccess::canUnlock($other, $me)) {
            return self::DAL_TALENTO;
        }
        return [];
    }

    /** Per il frontend: [['id' => chiave, 'testo' => testo]] */
    public static function presetPerFrontend(User $me, User $other): array
    {
        return collect(self::preset($me, $other))
            ->map(fn ($testo, $id) => ['id' => $id, 'testo' => $testo])
            ->values()->all();
    }
}
