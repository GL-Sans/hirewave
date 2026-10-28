<?php
namespace App\Support;

use App\Models\DocumentoVerifica;
use App\Models\User;
use App\Notifications\HireWaveNotification;
use Illuminate\Support\Facades\Storage;

/**
 * Verifica automatica dei documenti: controlla che il documento sia coerente
 * con i dati dichiarati nel profilo (business plan, par. 3.3).
 *
 * Nel prototipo i controlli sono regole esplicite e spiegate nell'esito.
 * Il modulo IA previsto dal business plan (lettura del contenuto del file)
 * si innesta in controlla(), senza cambiare il resto:
 * stessi stati, stessi esiti, stesso ricalcolo del rating.
 *
 * Esiti: verificato · rifiutato (incoerente) · revisione_manuale (ambiguo,
 * lo decide un amministratore).
 */
class VerificaDocumenti
{
    // Età minima plausibile al conseguimento del titolo
    private const ETA_MINIMA = [
        'licenza_media' => 13,
        'diploma' => 18,
        'laurea_triennale' => 21,
        'laurea_magistrale' => 23,
    ];

    // Sotto questa dimensione un file non è una scansione leggibile
    public const DIMENSIONE_MINIMA = 5 * 1024;

    public static function verifica(DocumentoVerifica $doc): DocumentoVerifica
    {
        $user = $doc->user;
        [$stato, $esito] = self::controlla($doc, $user);

        $doc->forceFill([
            'stato' => $stato,
            'esito' => $esito,
            'verificato_at' => $stato === 'verificato' ? now() : null,
        ])->save();

        self::dopoEsito($doc, $user);

        return $doc;
    }

    /** Esito deciso da un amministratore per un caso ambiguo */
    public static function revisiona(DocumentoVerifica $doc, User $admin, bool $approvato, ?string $nota): DocumentoVerifica
    {
        $doc->forceFill([
            'stato' => $approvato ? 'verificato' : 'rifiutato',
            'esito' => trim(($approvato ? 'Approvato' : 'Rifiutato') . ' in revisione manuale. ' . (string) $nota),
            'revisionato_da' => $admin->id,
            'verificato_at' => $approvato ? now() : null,
        ])->save();

        self::dopoEsito($doc, $doc->user);

        return $doc;
    }

    public static function descrizione(DocumentoVerifica $doc): string
    {
        return match ($doc->tipo) {
            'istruzione' => RatingTecnico::ISTRUZIONE_LABEL[$doc->riferimento] ?? 'Titolo di studio',
            'esperienza' => 'Esperienza' . ($doc->anni ? " ({$doc->anni} " . ($doc->anni === 1 ? 'anno' : 'anni') . ')' : '') . ($doc->riferimento ? " · {$doc->riferimento}" : ''),
            default => "Certificazione «{$doc->riferimento}»",
        };
    }

    private static function dopoEsito(DocumentoVerifica $doc, User $user): void
    {
        $nome = self::descrizione($doc);

        if ($doc->stato === 'verificato') {
            RatingTecnico::aggiorna($user, "Documento verificato: $nome");
            $user->notify(new HireWaveNotification(
                'verifica',
                'Documento verificato',
                "$nome è verificato: il rating tecnico è ora {$user->rating_tecnico} e il badge è verde.",
                '/profile',
            ));
        } elseif ($doc->stato === 'rifiutato') {
            $user->notify(new HireWaveNotification('verifica', 'Documento non verificato', "$nome: {$doc->esito}", '/profile'));
        } elseif ($doc->stato === 'revisione_manuale') {
            User::where('is_admin', true)->get()->each->notify(new HireWaveNotification(
                'verifica',
                'Documento da revisionare',
                "{$user->first_name}: $nome. {$doc->esito}",
                '/admin/documenti',
            ));
        }
    }

    /** @return array{0: string, 1: string} [stato, esito] */
    private static function controlla(DocumentoVerifica $doc, User $user): array
    {
        if (!Storage::disk('local')->exists($doc->file_path)) {
            return ['rifiutato', 'Il file non è stato salvato correttamente: caricalo di nuovo.'];
        }
        if ($doc->dimensione < self::DIMENSIONE_MINIMA) {
            return ['rifiutato', 'Il file è troppo piccolo per essere una scansione leggibile (minimo 5 KB).'];
        }

        // Lo stesso file già usato da un'altra persona: possibile documento altrui
        $doppione = DocumentoVerifica::where('hash', $doc->hash)
            ->where('user_id', '!=', $user->id)
            ->where('stato', '!=', 'rifiutato')
            ->exists();
        if ($doppione) {
            return ['revisione_manuale', 'Lo stesso file risulta caricato da un altro utente: serve un controllo manuale.'];
        }

        $anno = (int) $doc->anno;
        $annoCorrente = (int) now()->year;
        $annoNascita = $user->birth_date?->year;

        if ($anno && $anno > $annoCorrente) {
            return ['rifiutato', "L'anno indicato ($anno) è nel futuro."];
        }

        return match ($doc->tipo) {
            'istruzione' => self::controllaIstruzione($doc, $user, $anno, $annoNascita),
            'esperienza' => self::controllaEsperienza($doc, $user, $anno, $annoCorrente, $annoNascita),
            default => self::controllaCertificazione($doc, $user, $anno, $annoNascita),
        };
    }

    private static function controllaIstruzione(DocumentoVerifica $doc, User $user, int $anno, ?int $annoNascita): array
    {
        $label = RatingTecnico::ISTRUZIONE_LABEL[$doc->riferimento] ?? null;
        if (!$label) {
            return ['rifiutato', 'Titolo di studio non riconosciuto.'];
        }
        if ($doc->riferimento !== $user->livello_istruzione) {
            $dichiarato = RatingTecnico::ISTRUZIONE_LABEL[$user->livello_istruzione] ?? 'nessun titolo';
            return ['rifiutato', "Il documento è per «{$label}» ma nel profilo hai dichiarato «{$dichiarato}»: aggiorna prima il curriculum."];
        }
        if (!$anno) {
            return ['rifiutato', 'Indica l\'anno di conseguimento del titolo.'];
        }

        if ($annoNascita) {
            $eta = $anno - $annoNascita;
            $minima = self::ETA_MINIMA[$doc->riferimento];
            if ($eta < $minima) {
                return ['revisione_manuale', "Titolo conseguito a $eta anni: insolito per «{$label}» (di solito da $minima anni in su). Serve un controllo manuale."];
            }
        }

        return ['verificato', "«{$label}» del $anno coerente con i dati del profilo."];
    }

    private static function controllaEsperienza(DocumentoVerifica $doc, User $user, int $anno, int $annoCorrente, ?int $annoNascita): array
    {
        $anni = (int) $doc->anni;
        $dichiarati = (int) $user->anni_esperienza;

        if ($anni < 1) {
            return ['rifiutato', 'Indica quanti anni di esperienza copre il documento.'];
        }
        if ($dichiarati < 1) {
            return ['rifiutato', 'Nel profilo non hai dichiarato anni di esperienza: aggiorna prima il curriculum.'];
        }
        if ($anno && $anno + $anni > $annoCorrente + 1) {
            return ['rifiutato', "Dal $anno a oggi non possono essere passati $anni anni."];
        }
        if ($annoNascita && $anno && $anno - $annoNascita < 15) {
            return ['revisione_manuale', 'Esperienza iniziata prima dei 15 anni: serve un controllo manuale.'];
        }
        if ($annoNascita && $dichiarati > $annoCorrente - $annoNascita - 14) {
            return ['revisione_manuale', "$dichiarati anni di esperienza dichiarati non sono coerenti con l'età: serve un controllo manuale."];
        }

        $coperti = min($anni, $dichiarati);
        $nota = $anni > $dichiarati
            ? " Il documento copre $anni anni, ne contano $dichiarati come dichiarato nel profilo."
            : ($anni < $dichiarati ? ' Gli altri ' . ($dichiarati - $anni) . ' restano dichiarati.' : '');

        return ['verificato', "$coperti " . ($coperti === 1 ? 'anno verificato' : 'anni verificati') . " su $dichiarati dichiarati.$nota"];
    }

    private static function controllaCertificazione(DocumentoVerifica $doc, User $user, int $anno, ?int $annoNascita): array
    {
        if (mb_strlen(trim((string) $doc->riferimento)) < 2) {
            return ['rifiutato', 'Indica il nome della certificazione.'];
        }
        if ($annoNascita && $anno && $anno - $annoNascita < 14) {
            return ['revisione_manuale', 'Certificazione conseguita prima dei 14 anni: serve un controllo manuale.'];
        }

        return ['verificato', "Attestato di «{$doc->riferimento}»" . ($anno ? " del $anno" : '') . ' coerente con il profilo.'];
    }
}
