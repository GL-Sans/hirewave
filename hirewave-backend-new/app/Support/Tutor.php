<?php
namespace App\Support;

use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Tutor HireWave: chat di aiuto per lavoratori, professionisti e aziende
 * (business plan, par. 4.1).
 *
 * Nel prototipo risponde con regole sui dati reali dell'utente (rating,
 * consigli, annunci, talenti), senza modelli esterni. Il modulo IA (Claude API
 * o altro LLM) si innesta in rispondi(): stesso input, stessa forma di uscita.
 *
 * Uscita: ['testo' => string, 'azioni' => [['label', 'to']], 'suggerimenti' => [string]]
 */
class Tutor
{
    public static function rispondi(User $user, string $domanda): array
    {
        $q = self::norm($domanda);

        return $user->role === 'COMPANY'
            ? self::azienda($user, $q)
            : self::talento($user, $q);
    }

    /** Messaggio di benvenuto, diverso per ruolo */
    public static function benvenuto(User $user): array
    {
        if ($user->role === 'COMPANY') {
            return self::esito(
                "Ciao {$user->first_name}! Sono il tutor HireWave per le aziende.\n"
                . "Dimmi chi cerchi (es. «cerco un cameriere con HACCP») e ti preparo una shortlist con rating e costo di sblocco.",
                [],
                ['Cerco un cameriere', 'Cerco profili certificati', 'Quanto costa sbloccare?', 'Confronta i miei salvati'],
            );
        }

        return self::esito(
            "Ciao {$user->first_name}! Sono il tuo tutor HireWave.\n"
            . "Ti aiuto a capire e far crescere il tuo rating, a verificare i documenti e a valutare la tua retribuzione.",
            [],
            ['Perché ho questo rating?', 'Come aumento il rating?', 'La mia retribuzione è giusta?', 'Annunci per me'],
        );
    }

    // ── Lavoratori e professionisti ──────────────────────────────────────

    private static function talento(User $user, string $q): array
    {
        if (!$user->onboarding_completato) {
            return self::esito(
                'Completa prima le 5 domande iniziali: servono a calcolare il tuo rating tecnico.',
                [['label' => 'Completa il profilo', 'to' => '/onboarding']],
            );
        }

        return match (true) {
            self::ha($q, ['aument', 'miglior', 'salire', 'crescere', 'consigl', 'alzare', 'di piu']) => self::comeAumentare($user),
            self::ha($q, ['perche', 'rating', 'punteggio', 'punti', 'calcol', 'valutaz']) => self::spiegaRating($user),
            self::ha($q, ['verific', 'document', 'badge', 'certificat', 'verde', 'caric', 'attestat', 'diploma', 'laurea']) => self::verifica($user),
            self::ha($q, ['retribuz', 'ral', 'stipend', 'guadagn', 'paga', 'salari', 'tariff', 'compenso']) => self::retribuzione($user),
            self::ha($q, ['annunc', 'offert', 'lavoro', 'candid', 'opportun', 'posizion']) => self::annunci($user),
            self::ha($q, ['premium', 'boost', 'abbonament', 'piano', 'evidenza', 'sponsor', 'prezz', 'costa']) => self::piani($user),
            self::ha($q, ['privacy', 'anonim', 'chi vede', 'nome', 'contatt', 'sblocc']) => self::privacyTalento(),
            self::ha($q, ['recension', 'stelle', 'reputaz']) => self::recensioni(),
            self::ha($q, ['ciao', 'salve', 'buongiorno', 'aiuto', 'cosa puoi', 'cosa sai', 'help']) => self::benvenuto($user),
            default => self::nonCapito(false),
        };
    }

    private static function spiegaRating(User $user): array
    {
        $d = RatingTecnico::dettaglio($user);
        $righe = ["Il tuo rating tecnico è {$d['totale']}/100. Ecco da dove viene:"];
        foreach ($d['voci'] as $v) {
            $righe[] = "• {$v['etichetta']}: {$v['punti']}/{$v['max']} — {$v['valore']} (" . self::stato($v['stato']) . ')';
        }
        $righe[] = $d['verificato']
            ? 'Hai almeno un documento verificato: badge verde «Certificato».'
            : "I dati solo dichiarati valgono l'80%: per questo il massimo senza documenti è {$d['max_dichiarato']}.";

        return self::esito(
            implode("\n", $righe),
            [['label' => 'Vedi il dettaglio nel profilo', 'to' => '/profile']],
            ['Come aumento il rating?', 'Come funziona la verifica?'],
        );
    }

    private static function comeAumentare(User $user): array
    {
        $d = RatingTecnico::dettaglio($user);
        if (empty($d['consigli'])) {
            return self::esito("Il tuo rating è {$d['totale']}/100: hai già verificato tutto quello che conta. Ottimo lavoro!", [], ['Annunci per me']);
        }

        $righe = ["Rating attuale {$d['totale']}/100. Le azioni che rendono di più:"];
        foreach ($d['consigli'] as $i => $c) {
            $righe[] = ($i + 1) . ". {$c['azione']}: +{$c['punti']} punti";
        }
        $potenziale = $d['totale'] + array_sum(array_column($d['consigli'], 'punti'));
        $righe[] = "Facendole tutte arrivi a circa " . min(100, $potenziale) . '/100.';

        $primo = $d['consigli'][0];
        $azione = in_array($primo['tipo'], ['istruzione', 'esperienza', 'certificazione'], true) && empty($primo['nota'])
            ? ['label' => 'Carica un documento', 'to' => '/profile?carica=' . $primo['tipo']]
            : ['label' => 'Aggiorna il curriculum', 'to' => '/profile/' . $user->id . '/curriculum'];

        return self::esito(implode("\n", $righe), [$azione], ['Come funziona la verifica?', 'Perché ho questo rating?']);
    }

    private static function verifica(User $user): array
    {
        $aperti = $user->documenti()->aperti()->count();
        $testo = "La verifica avviene in 5 passi:\n"
            . "1. Carichi il documento (PDF o foto)\n"
            . "2. Confermi: il dato resta bloccato finché la verifica è in corso\n"
            . "3. Controllo automatico di coerenza (date, età, titolo dichiarato)\n"
            . "4. Se è tutto in regola ottieni il badge verde «Certificato»\n"
            . "5. Il rating si ricalcola subito: il dato passa dall'80% al 100%";
        if ($aperti > 0) {
            $testo .= "\n\nHai $aperti " . ($aperti === 1 ? 'documento' : 'documenti') . ' in verifica.';
        }

        return self::esito($testo, [['label' => 'Carica un documento', 'to' => '/profile?carica=istruzione']], ['Come aumento il rating?']);
    }

    private static function retribuzione(User $user): array
    {
        $attesa = self::importoMensile($user->ral_aspettativa);
        $mercato = self::mercato($user->settore);

        if (!$mercato) {
            return self::esito(
                "Non ci sono ancora abbastanza annunci" . ($user->settore ? " nel settore {$user->settore}" : '') . ' per un confronto affidabile. Riprova tra qualche giorno.',
                [], ['Annunci per me'],
            );
        }

        $righe = ["Nel settore {$mercato['settore']} gli annunci attivi offrono in media €" . self::euro($mercato['media']) . "/mese ({$mercato['n']} annunci, da €" . self::euro($mercato['min']) . ' a €' . self::euro($mercato['max']) . ').'];

        if (!Abbonamento::isPremium($user)) {
            $righe[] = "La tua aspettativa: {$user->ral_aspettativa}.";
            $righe[] = "Con Premium ricevi l'analisi completa: posizione rispetto al mercato e quanto chiedere in base al tuo rating.";
            return self::esito(implode("\n", $righe), [['label' => 'Scopri Premium', 'to' => '/abbonamenti']], ['Come aumento il rating?']);
        }

        if ($attesa) {
            $diff = (int) round(($attesa - $mercato['media']) / $mercato['media'] * 100);
            $righe[] = "La tua aspettativa (circa €" . self::euro($attesa) . '/mese) è ' . match (true) {
                $diff > 10 => "sopra la media del $diff%.",
                $diff < -10 => 'sotto la media del ' . abs($diff) . '%: puoi chiedere di più.',
                default => 'in linea con il mercato.',
            };
        }
        // Rating alto = potere contrattuale: suggerimento sulla fascia alta o media del mercato
        $rating = (int) $user->rating_tecnico;
        $consiglio = $rating >= 70 ? $mercato['max'] : ($rating >= 45 ? $mercato['media'] : $mercato['min'] + ($mercato['media'] - $mercato['min']) / 2);
        $righe[] = "Con un rating di $rating/100 puoi proporre circa €" . self::euro($consiglio) . '/mese' . ($rating < 70 ? ': verificando i documenti sali di fascia.' : '.');

        return self::esito(implode("\n", $righe), [['label' => 'Aggiorna la retribuzione', 'to' => '/profile/' . $user->id . '/curriculum']], ['Come aumento il rating?', 'Annunci per me']);
    }

    private static function annunci(User $user): array
    {
        $posts = Post::with('user')->where('type', 'job')->latest()->limit(50)->get()
            ->filter(fn ($p) => $p->user && $p->user->role === 'COMPANY')
            ->sortByDesc(fn ($p) => $p->user->settore === $user->settore)
            ->take(3)->values();

        if ($posts->isEmpty()) {
            return self::esito('Al momento non ci sono annunci di lavoro. Ti avviso con una notifica quando un\'azienda che segui ne pubblica uno.', [['label' => 'Vedi le aziende', 'to' => '/companies']]);
        }

        $righe = ['Gli annunci più adatti a te:'];
        foreach ($posts as $p) {
            $righe[] = "• {$p->title} — {$p->user->first_name} {$p->user->last_name}" . ($p->budget ? " · €{$p->budget}" . ($p->budget_type ? ' ' . Str::lower($p->budget_type) : '') : '');
        }

        return self::esito(implode("\n", $righe), [['label' => 'Apri il feed', 'to' => '/feed']], ['La mia retribuzione è giusta?']);
    }

    private static function piani(User $user): array
    {
        $attivo = Abbonamento::attivo($user);
        $testo = "Piani per lavoratori e professionisti:\n"
            . "• Free: profilo, rating, verifica documenti, " . Abbonamento::TUTOR_FREE_AL_GIORNO . " domande al tutor al giorno\n"
            . "• Premium €14,99/mese: profilo in evidenza, priorità nei risultati, analisi della retribuzione, tutor illimitato\n"
            . "• Boost €29,99/mese: tutto il Premium + primo posto nei risultati, badge Sponsor e post in evidenza nel feed";
        if ($attivo) {
            $testo .= "\n\nIl tuo piano attuale: " . Abbonamento::PIANI[$attivo]['nome'] . '.';
        }

        return self::esito($testo, [['label' => 'Vedi i piani', 'to' => '/abbonamenti']]);
    }

    private static function privacyTalento(): array
    {
        return self::esito(
            "Il tuo nome, la foto e i contatti sono nascosti. Prima dello sblocco aziende e professionisti vedono solo rating, badge, settore, titolo di studio e retribuzione attesa.\n"
            . "Quando qualcuno paga lo sblocco ricevi una notifica: da quel momento può vederti e scriverti per 30 giorni.",
            [], ['Come aumento il rating?'],
        );
    }

    // ── Aziende ──────────────────────────────────────────────────────────

    private static function azienda(User $user, string $q): array
    {
        return match (true) {
            self::ha($q, ['confront', 'salvat', 'prefer']) => self::confrontaSalvati($user),
            self::ha($q, ['cerc', 'trov', 'serv', 'bisogno', 'shortlist', 'assum', 'candidat', 'profil', 'certificat'])
                || self::settoreDa($q) || self::chiaviRuolo($q) => self::shortlist($user, $q),
            self::ha($q, ['costo', 'costa', 'prezz', 'pagare', 'sblocc', 'quanto']) => self::costi(),
            self::ha($q, ['document', 'premium', 'originali']) => self::verificaPremium(),
            self::ha($q, ['rating', 'punteggio', 'badge', 'verde', 'grigio', 'affidab']) => self::spiegaRatingAzienda(),
            self::ha($q, ['recension', 'stelle', 'reputaz']) => self::recensioni(),
            self::ha($q, ['ciao', 'salve', 'buongiorno', 'aiuto', 'cosa puoi', 'cosa sai', 'help']) => self::benvenuto($user),
            default => self::nonCapito(true),
        };
    }

    /** Shortlist per rating dai talenti che corrispondono alla richiesta */
    private static function shortlist(User $user, string $q): array
    {
        $soloCertificati = self::ha($q, ['certificat', 'verificat', 'verde']);
        $settore = self::settoreDa($q);
        $chiavi = self::chiaviRuolo($q);

        $talenti = User::whereIn('role', ['WORKER', 'PRO'])
            ->where('onboarding_completato', true)
            ->when($soloCertificati, fn ($w) => $w->where('badge', 'verde'))
            ->get()
            ->map(function (User $t) use ($chiavi, $settore) {
                // Solo dati visibili prima dello sblocco: niente certificazioni né skill private
                $testo = self::norm(implode(' ', [$t->description, $t->settore, $t->curriculum_public ? implode(' ', $t->skills ?? []) : '']));
                $match = collect($chiavi)->filter(fn ($k) => str_contains($testo, $k))->count();
                return ['u' => $t, 'match' => $match, 'settore' => $settore && $t->settore === $settore];
            })
            ->filter(fn ($r) => $chiavi ? $r['match'] > 0 : ($settore ? $r['settore'] : true))
            ->sort(fn ($a, $b) => [$b['match'], $b['settore'], Abbonamento::priorita($b['u']), $b['u']->rating_tecnico]
                <=> [$a['match'], $a['settore'], Abbonamento::priorita($a['u']), $a['u']->rating_tecnico])
            ->take(3)->values();

        if ($talenti->isEmpty()) {
            return self::esito(
                'Non ho trovato profili per questa richiesta' . ($soloCertificati ? ' con badge verde' : '') . '. Prova con un ruolo più generico (es. «sala», «cucina», «reception») o togli il filtro certificati.',
                [['label' => 'Sfoglia i talenti', 'to' => '/talents']],
                ['Cerco profili certificati', 'Cerco un cuoco'],
            );
        }

        $unlocked = ProfileAccess::unlockedIds($user);
        $righe = ['Ecco la shortlist, dal rating più alto:'];
        $azioni = [];
        $totale = 0;
        foreach ($talenti as $i => $r) {
            $t = $r['u'];
            $sbloccato = in_array($t->id, $unlocked, true);
            $prezzo = ProfileAccess::unlockPrice($t);
            $totale += $sbloccato ? 0 : $prezzo;
            $righe[] = ($i + 1) . ". {$t->first_name} · rating {$t->rating_tecnico}/100 · " . ($t->badge === 'verde' ? 'Certificato' : 'Dichiarato')
                . ($t->settore ? " · {$t->settore}" : '')
                . ($t->livello_istruzione ? ' · ' . RatingTecnico::ISTRUZIONE_LABEL[$t->livello_istruzione] : '')
                . ($sbloccato ? ' · già sbloccato' : ' · sblocco €' . self::euro($prezzo / 100, 2));
            $azioni[] = ['label' => "Apri {$t->first_name}", 'to' => '/profile/' . $t->id];
        }
        if ($totale > 0) {
            $righe[] = 'Costo per sbloccarli tutti: €' . self::euro($totale / 100, 2) . ' (accesso a nome, contatti e chat per 30 giorni).';
        }

        return self::esito(implode("\n", $righe), $azioni, ['Solo profili certificati', 'Quanto costa sbloccare?']);
    }

    private static function confrontaSalvati(User $user): array
    {
        $ids = \App\Http\Controllers\Api\ConnectionController::savedIds($user);
        $salvati = User::whereIn('id', $ids)->whereIn('role', ['WORKER', 'PRO'])->orderByDesc('rating_tecnico')->get();

        if ($salvati->isEmpty()) {
            return self::esito('Non hai ancora profili salvati. Nei Talenti tocca il segnalibro sulla card per salvarli e poi chiedimi di confrontarli.', [['label' => 'Vai ai talenti', 'to' => '/talents']]);
        }

        $righe = ['I tuoi salvati, dal più forte:'];
        foreach ($salvati as $t) {
            $righe[] = "• {$t->first_name}: rating {$t->rating_tecnico}/100, " . ($t->badge === 'verde' ? 'certificato' : 'dichiarato')
                . ($t->rating_reputazionale > 0 ? ", {$t->rating_reputazionale}★" : '')
                . ($t->ral_aspettativa ? ", chiede {$t->ral_aspettativa}" : '');
        }
        $migliore = $salvati->first();

        return self::esito(implode("\n", $righe), [['label' => "Apri {$migliore->first_name}", 'to' => '/profile/' . $migliore->id]]);
    }

    private static function costi(): array
    {
        return self::esito(
            "Paghi solo quando trovi il candidato giusto, senza abbonamento:\n"
            . "• Sblocco profilo «Dichiarato» (badge grigio): €14,99\n"
            . "• Sblocco profilo «Certificato» (badge verde): €29,99\n"
            . "• Verifica Premium, documenti originali: €9,99\n"
            . "Lo sblocco dà nome, contatti e chat per 30 giorni. Puoi sbloccare anche dalla chat, quando un talento ti scrive.",
            [['label' => 'Sfoglia i talenti', 'to' => '/talents']],
            ['Cerco profili certificati'],
        );
    }

    private static function verificaPremium(): array
    {
        return self::esito(
            'Con la Verifica Premium (€9,99, dopo lo sblocco) scarichi i documenti originali che hanno certificato il profilo: titoli di studio, attestati, referenze. È disponibile solo per i profili con badge verde.',
            [], ['Quanto costa sbloccare?'],
        );
    }

    private static function spiegaRatingAzienda(): array
    {
        return self::esito(
            "Il rating tecnico (0–100) somma istruzione (max 30), esperienza (max 40) e certificazioni (max 30).\n"
            . "I dati dichiarati valgono l'80%, quelli verificati con documenti il 100%: un profilo grigio arriva al massimo a 80.\n"
            . "Badge verde «Certificato» = almeno un documento verificato. Nel profilo trovi il perché del rating voce per voce.",
            [], ['Cerco profili certificati'],
        );
    }

    // ── Comuni ───────────────────────────────────────────────────────────

    private static function recensioni(): array
    {
        return self::esito(
            'Le recensioni sono verificate: può lasciarle solo un\'azienda o un professionista che ha pagato lo sblocco del profilo. La media delle stelle è il rating reputazionale.',
        );
    }

    private static function nonCapito(bool $azienda): array
    {
        return self::esito(
            'Non sono sicuro di aver capito. Posso aiutarti con queste cose:',
            [],
            $azienda
                ? ['Cerco un cameriere', 'Quanto costa sbloccare?', 'Cosa significa il badge verde?', 'Confronta i miei salvati']
                : ['Perché ho questo rating?', 'Come aumento il rating?', 'La mia retribuzione è giusta?', 'Premium e Boost'],
        );
    }

    private const SETTORI = [
        'Ristorazione / HoReCa' => ['ristora', 'horeca', 'cucina', 'cuoc', 'chef', 'camerier', 'sala', 'bar', 'pizz'],
        'Turismo / Hospitality' => ['hotel', 'turism', 'reception', 'bagnin', 'spiaggia', 'albergh', 'hospitality'],
        'Eventi' => ['event', 'hostess', 'fiera', 'matrimon', 'fotograf'],
        'Logistica' => ['logistic', 'magazzin', 'muletto', 'autista', 'corrier', 'consegn'],
        'Commercio / Retail' => ['commess', 'negozio', 'retail', 'vendit', 'cassier'],
        'IT / Digitale' => ['sviluppat', 'program', 'web', 'grafic', 'social', 'informatic', 'digital'],
    ];

    // Ruolo cercato → parole che lo descrivono nei profili
    private const RUOLI = [
        'camerier' => ['camerier', 'sala'], 'sala' => ['sala'], 'cuoc' => ['cucina', 'chef', 'cuoc'], 'chef' => ['chef', 'cucina'],
        'cucina' => ['cucina', 'chef'], 'barist' => ['barist', 'bartender', 'cocktail'], 'bartender' => ['bartender', 'cocktail'],
        'bagnin' => ['bagnin', 'salvament'], 'reception' => ['reception'], 'hostess' => ['hostess', 'accoglienza'],
        'magazzin' => ['magazzin', 'muletto'], 'autista' => ['patente', 'autista'], 'sviluppat' => ['sviluppat', 'react', 'laravel', 'web'],
        'grafic' => ['grafic', 'branding'], 'fotograf' => ['fotograf', 'video'], 'social' => ['social'],
    ];

    private static function settoreDa(string $q): ?string
    {
        foreach (self::SETTORI as $settore => $parole) {
            if (self::ha($q, $parole)) {
                return $settore;
            }
        }
        return null;
    }

    private static function chiaviRuolo(string $q): array
    {
        $chiavi = [];
        foreach (self::RUOLI as $ruolo => $parole) {
            if (str_contains($q, $ruolo)) {
                array_push($chiavi, ...$parole);
            }
        }
        // Certificazioni citate (es. «con HACCP») contano solo se il profilo le scrive nella descrizione
        if (preg_match_all('/\b(haccp|blsd|aibes|sommelier|inglese|tedesco)\b/', $q, $m)) {
            array_push($chiavi, ...$m[1]);
        }
        return array_values(array_unique($chiavi));
    }

    /** Media mensile degli annunci con paga mensile, nel settore se ce ne sono abbastanza */
    private static function mercato(?string $settore): ?array
    {
        $posts = Post::with('user')->where('type', 'job')->where('budget_type', 'Mensile')->whereNotNull('budget')->get()
            ->filter(fn ($p) => $p->user && $p->user->role === 'COMPANY');
        $nelSettore = $posts->filter(fn ($p) => $p->user->settore === $settore);
        $usati = $nelSettore->count() >= 2 ? $nelSettore : $posts;

        if ($usati->isEmpty()) {
            return null;
        }
        $importi = $usati->pluck('budget')->map(fn ($b) => (float) $b);

        return [
            'settore' => $usati === $nelSettore ? $settore : 'generale',
            'n' => $importi->count(),
            'media' => $importi->avg(),
            'min' => $importi->min(),
            'max' => $importi->max(),
        ];
    }

    /** "€1.000 – €1.500/mese" → 1250. Null per tariffe giornaliere o freelance */
    private static function importoMensile(?string $ral): ?float
    {
        if (!$ral || !str_contains($ral, 'mese')) {
            return null;
        }
        preg_match_all('/\d[\d.]*/', $ral, $m);
        $numeri = array_map(fn ($n) => (float) str_replace('.', '', $n), $m[0]);
        if (!$numeri) {
            return null;
        }
        // "Meno di €1.000" → 900
        return str_contains(Str::lower($ral), 'meno') ? $numeri[0] * 0.9 : array_sum($numeri) / count($numeri);
    }

    private static function stato(string $stato): string
    {
        return ['verificato' => 'verificato', 'parziale' => 'in parte verificato', 'dichiarato' => 'dichiarato', 'mancante' => 'non indicato'][$stato] ?? $stato;
    }

    private static function euro(float $n, int $decimali = 0): string
    {
        return number_format($n, $decimali, ',', '.');
    }

    private static function norm(?string $s): string
    {
        return Str::lower(Str::ascii((string) $s));
    }

    private static function ha(string $q, array $parole): bool
    {
        foreach ($parole as $p) {
            if (str_contains($q, $p)) {
                return true;
            }
        }
        return false;
    }

    private static function esito(string $testo, array $azioni = [], array $suggerimenti = []): array
    {
        return ['testo' => $testo, 'azioni' => $azioni, 'suggerimenti' => $suggerimenti];
    }
}
