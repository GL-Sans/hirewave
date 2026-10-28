<?php
namespace App\Support;

use App\Models\DocumentoVerifica;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Rating tecnico (0-100) di lavoratori e professionisti, versione 2.
 *
 *   rating = istruzione (max 30) + esperienza (max 40) + certificazioni (max 30)
 *
 * Ogni dato vale il 100% se verificato con un documento e l'80% se solo
 * dichiarato: un profilo con badge grigio arriva al massimo a 80.
 *
 * Calcolo e spiegazione escono dalla stessa funzione (dettaglio), così il
 * numero mostrato nel profilo e il suo perché non possono divergere.
 */
class RatingTecnico
{
    public const VERSIONE = 2;
    public const PESO_DICHIARATO = 0.8;

    public const ISTRUZIONE = [
        'licenza_media' => 6,
        'diploma' => 15,
        'laurea_triennale' => 23,
        'laurea_magistrale' => 30,
    ];

    public const ISTRUZIONE_LABEL = [
        'licenza_media' => 'Licenza media',
        'diploma' => 'Diploma',
        'laurea_triennale' => 'Laurea triennale',
        'laurea_magistrale' => 'Laurea magistrale',
    ];

    // Punti delle prime tre certificazioni: le altre non aggiungono punti
    public const CERTIFICAZIONI = [12, 9, 9];

    // Testi che vogliono dire "nessuna certificazione"
    private const NESSUNA = ['no', 'nessuna', 'nessuno', 'nessun', 'niente', 'non ho', 'n/a', 'na', '-', '--', '/'];

    /** Punti pieni dell'esperienza: 6 l'anno per i primi 5, poi 2 l'anno fino a 10 */
    public static function puntiEsperienza(int $anni): int
    {
        $anni = max(0, $anni);
        return 6 * min($anni, 5) + 2 * max(0, min($anni, 10) - 5);
    }

    /** Certificazioni dal testo libero dell'onboarding, senza doppioni e senza "no" */
    public static function certificazioniDa(?string $testo): array
    {
        $out = [];
        foreach (preg_split('/[,;\n]+/u', (string) $testo) as $parte) {
            $nome = trim(preg_replace('/\s+/u', ' ', $parte), " .\t");
            if (mb_strlen($nome) < 2 || in_array(self::normalizza($nome), self::NESSUNA, true)) {
                continue;
            }
            $out[self::normalizza($nome)] ??= $nome;
        }
        return array_values($out);
    }

    public static function normalizza(?string $s): string
    {
        return mb_strtolower(trim(preg_replace('/\s+/u', ' ', (string) $s)));
    }

    /**
     * Il perché del rating, voce per voce. $documenti evita la query quando
     * il chiamante li ha già (es. elenchi).
     */
    public static function dettaglio(User $user, $documenti = null): array
    {
        $documenti ??= DocumentoVerifica::where('user_id', $user->id)->get();
        $verificati = $documenti->where('stato', 'verificato');
        $aperti = $documenti->whereIn('stato', ['in_verifica', 'revisione_manuale']);

        $voci = [
            self::voceIstruzione($user, $verificati, $aperti),
            self::voceEsperienza($user, $verificati, $aperti),
            self::voceCertificazioni($user, $verificati, $aperti),
        ];

        $totale = min(100, array_sum(array_column($voci, 'punti')));

        return [
            'versione' => self::VERSIONE,
            'totale' => $totale,
            'max' => 100,
            'max_dichiarato' => 80,
            'verificato' => $verificati->isNotEmpty(),
            'voci' => $voci,
            'consigli' => self::consigli($voci),
        ];
    }

    public static function calcola(User $user, $documenti = null): int
    {
        return self::dettaglio($user, $documenti)['totale'];
    }

    /**
     * Ricalcola rating e badge, salva e registra la variazione con il motivo.
     * Unico punto in cui il rating viene scritto.
     */
    public static function aggiorna(User $user, string $motivo): int
    {
        if ($user->role === 'COMPANY' || !$user->onboarding_completato) {
            return (int) $user->rating_tecnico;
        }

        $documenti = DocumentoVerifica::where('user_id', $user->id)->get();
        $nuovo = self::calcola($user, $documenti);
        $badge = $documenti->where('stato', 'verificato')->isNotEmpty() ? 'verde' : 'grigio';

        DB::transaction(function () use ($user, $nuovo, $badge, $motivo) {
            // Valore salvato, non quello dell'istanza: un'altra istanza dello
            // stesso utente (es. la verifica di un documento) può averlo già cambiato
            $vecchio = (int) DB::table('users')->where('id', $user->id)->lockForUpdate()->value('rating_tecnico');

            DB::table('users')->where('id', $user->id)->update(['rating_tecnico' => $nuovo, 'badge' => $badge]);
            $user->forceFill(['rating_tecnico' => $nuovo, 'badge' => $badge])->syncOriginalAttributes(['rating_tecnico', 'badge']);

            if ($nuovo !== $vecchio) {
                DB::table('rating_storico')->insert([
                    'user_id' => $user->id,
                    'valore_precedente' => $vecchio,
                    'valore' => $nuovo,
                    'motivo' => mb_substr($motivo, 0, 255),
                    'created_at' => now(),
                ]);
            }
        });

        return $nuovo;
    }

    /**
     * Versione per chi guarda un profilo altrui: punti e stato per voce sì,
     * nomi delle certificazioni e consigli solo se $completo.
     */
    public static function pubblico(array $dettaglio, bool $completo): array
    {
        unset($dettaglio['consigli']);
        if ($completo) {
            return $dettaglio;
        }

        foreach ($dettaglio['voci'] as &$voce) {
            if ($voce['chiave'] === 'certificazioni') {
                $n = count($voce['elementi']);
                $voce['valore'] = $n === 0 ? 'Nessuna' : ($n === 1 ? '1 certificazione' : "$n certificazioni");
                $voce['elementi'] = array_map(fn ($e) => ['nome' => null, 'punti' => $e['punti'], 'stato' => $e['stato']], $voce['elementi']);
            }
        }
        return $dettaglio;
    }

    private static function stato(int $verificati, int $totali): string
    {
        if ($totali === 0) return 'mancante';
        if ($verificati === 0) return 'dichiarato';
        return $verificati >= $totali ? 'verificato' : 'parziale';
    }

    private static function voceIstruzione(User $user, $verificati, $aperti): array
    {
        $livello = $user->livello_istruzione;
        $base = self::ISTRUZIONE[$livello] ?? 0;
        $ok = $base > 0 && $verificati->where('tipo', 'istruzione')
            ->contains(fn ($d) => $d->riferimento === $livello);

        $punti = (int) round($ok ? $base : $base * self::PESO_DICHIARATO);
        $label = self::ISTRUZIONE_LABEL[$livello] ?? null;

        return [
            'chiave' => 'istruzione',
            'etichetta' => 'Istruzione',
            'valore' => $label ?? 'Non indicata',
            'punti' => $punti,
            'max' => 30,
            'stato' => self::stato($ok ? 1 : 0, $base > 0 ? 1 : 0),
            'in_verifica' => $aperti->where('tipo', 'istruzione')->isNotEmpty(),
            'spiegazione' => $base === 0
                ? 'Titolo di studio non indicato: 0 punti.'
                : ($ok
                    ? "$label = $base punti, verificato con documento (100%)."
                    : "$label = $base punti, dichiarato (80%) = $punti. Verificandolo arrivi a $base."),
            'potenziale' => $base,
        ];
    }

    private static function voceEsperienza(User $user, $verificati, $aperti): array
    {
        $anni = (int) ($user->anni_esperienza ?? $user->years_experience ?? 0);
        $anniVerificati = min($anni, (int) $verificati->where('tipo', 'esperienza')->max('anni'));

        $pieni = self::puntiEsperienza($anni);
        $pieniVerificati = self::puntiEsperienza($anniVerificati);
        $punti = (int) round($pieniVerificati + ($pieni - $pieniVerificati) * self::PESO_DICHIARATO);

        if ($anni === 0) {
            $spiegazione = 'Nessun anno di esperienza indicato: 0 punti.';
        } elseif ($anniVerificati >= $anni) {
            $spiegazione = "$anni anni = $pieni punti, verificati con documento (100%).";
        } elseif ($anniVerificati > 0) {
            $spiegazione = "$anni anni = $pieni punti: $anniVerificati verificati al 100%, gli altri dichiarati all'80% = $punti.";
        } else {
            $spiegazione = "$anni anni = $pieni punti, dichiarati (80%) = $punti.";
        }

        return [
            'chiave' => 'esperienza',
            'etichetta' => 'Esperienza',
            'valore' => $anni === 1 ? '1 anno' : "$anni anni",
            'punti' => $punti,
            'max' => 40,
            'stato' => self::stato($anniVerificati, $anni),
            'in_verifica' => $aperti->where('tipo', 'esperienza')->isNotEmpty(),
            'spiegazione' => $spiegazione . ($anni < 10 ? ' Scala: 6 punti l\'anno fino a 5 anni, poi 2 l\'anno fino a 10.' : ''),
            'anni' => $anni,
            'anni_verificati' => $anniVerificati,
            'potenziale' => $pieni,
        ];
    }

    private static function voceCertificazioni(User $user, $verificati, $aperti): array
    {
        $nomiVerificati = $verificati->where('tipo', 'certificazione')
            ->map(fn ($d) => self::normalizza($d->riferimento))->all();
        $nomiAperti = $aperti->where('tipo', 'certificazione')
            ->map(fn ($d) => self::normalizza($d->riferimento))->all();

        // Le verificate prendono i pesi più alti
        $certificazioni = collect(self::certificazioniDa($user->certificazioni))
            ->map(fn ($nome) => ['nome' => $nome, 'ok' => in_array(self::normalizza($nome), $nomiVerificati, true)])
            ->sortByDesc('ok')
            ->values();

        $elementi = $certificazioni->map(function ($c, $i) use ($nomiAperti) {
            $peso = self::CERTIFICAZIONI[$i] ?? 0;
            $stato = $peso === 0 ? 'oltre_limite' : ($c['ok'] ? 'verificato' : 'dichiarato');
            return [
                'nome' => $c['nome'],
                'punti' => (int) round($c['ok'] ? $peso : $peso * self::PESO_DICHIARATO),
                'peso' => $peso,
                'stato' => in_array(self::normalizza($c['nome']), $nomiAperti, true) ? 'in_verifica' : $stato,
            ];
        })->all();

        $punti = array_sum(array_column($elementi, 'punti'));
        $conteggiate = min(count($elementi), count(self::CERTIFICAZIONI));
        $ok = $certificazioni->take(count(self::CERTIFICAZIONI))->where('ok', true)->count();

        return [
            'chiave' => 'certificazioni',
            'etichetta' => 'Certificazioni',
            'valore' => $conteggiate === 0 ? 'Nessuna' : implode(', ', array_column($elementi, 'nome')),
            'punti' => $punti,
            'max' => 30,
            'stato' => self::stato($ok, $conteggiate),
            'in_verifica' => !empty($nomiAperti),
            'spiegazione' => $conteggiate === 0
                ? 'Nessuna certificazione: 0 punti. La prima vale 12, la seconda e la terza 9 ciascuna.'
                : 'La prima certificazione vale 12 punti, la seconda e la terza 9 ciascuna; dichiarate all\'80%, verificate al 100%.'
                    . (count($elementi) > 3 ? ' Oltre la terza non si aggiungono punti.' : ''),
            'elementi' => $elementi,
            'potenziale' => array_sum(array_slice(self::CERTIFICAZIONI, 0, $conteggiate)),
        ];
    }

    /** Le tre azioni che fanno salire di più il rating, con i punti guadagnati */
    private static function consigli(array $voci): array
    {
        $out = [];
        [$istruzione, $esperienza, $cert] = $voci;

        if ($istruzione['stato'] === 'mancante') {
            $out[] = ['azione' => 'Indica il tuo titolo di studio', 'punti' => (int) round(self::ISTRUZIONE['diploma'] * self::PESO_DICHIARATO), 'tipo' => 'istruzione', 'nota' => 'es. diploma'];
        } elseif ($istruzione['stato'] === 'dichiarato' && !$istruzione['in_verifica']) {
            $out[] = ['azione' => 'Carica il documento del titolo di studio', 'punti' => $istruzione['potenziale'] - $istruzione['punti'], 'tipo' => 'istruzione'];
        }

        if ($esperienza['anni_verificati'] < $esperienza['anni'] && !$esperienza['in_verifica']) {
            $out[] = ['azione' => 'Verifica l\'esperienza con un contratto o una lettera di referenza', 'punti' => $esperienza['potenziale'] - $esperienza['punti'], 'tipo' => 'esperienza'];
        }
        if ($esperienza['anni'] < 10) {
            $guadagno = (int) round((self::puntiEsperienza($esperienza['anni'] + 1) - $esperienza['potenziale']) * self::PESO_DICHIARATO);
            $out[] = ['azione' => 'Aggiorna gli anni di esperienza quando ne maturi uno in più', 'punti' => $guadagno, 'tipo' => 'esperienza_anno'];
        }

        foreach ($cert['elementi'] as $e) {
            if ($e['stato'] === 'dichiarato') {
                $out[] = ['azione' => "Carica l'attestato di «{$e['nome']}»", 'punti' => $e['peso'] - $e['punti'], 'tipo' => 'certificazione', 'riferimento' => $e['nome']];
            }
        }
        $n = count($cert['elementi']);
        if ($n < count(self::CERTIFICAZIONI)) {
            $out[] = ['azione' => 'Aggiungi una certificazione (es. HACCP, BLSD, lingua)', 'punti' => (int) round(self::CERTIFICAZIONI[$n] * self::PESO_DICHIARATO), 'tipo' => 'certificazione_nuova'];
        }

        usort($out, fn ($a, $b) => $b['punti'] <=> $a['punti']);
        return array_slice(array_values(array_filter($out, fn ($c) => $c['punti'] > 0)), 0, 3);
    }
}
