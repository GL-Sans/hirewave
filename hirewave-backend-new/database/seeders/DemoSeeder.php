<?php
namespace Database\Seeders;

use App\Models\DocumentoVerifica;
use App\Models\Post;
use App\Models\Review;
use App\Models\User;
use App\Support\RatingTecnico;
use App\Support\VerificaDocumenti;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

/**
 * Dati dimostrativi per presentare il prototipo (investitori, aziende,
 * lavoratori). Rieseguibile: cancella e ricrea solo gli utenti @demo.hirewave.it.
 *
 *   php artisan db:seed --class=DemoSeeder
 *
 * I documenti passano dalla vera verifica automatica: badge e rating sono
 * calcolati come nell'app, non scritti a mano.
 */
class DemoSeeder extends Seeder
{
    public const DOMINIO = 'demo.hirewave.it';
    public const PASSWORD = 'HireWave2026!';

    public function run(): void
    {
        $this->pulisci();

        $staff = $this->azienda('admin', 'HireWave', 'Staff', 'IT / Digitale', 'micro', 1,
            'Team HireWave: verifica dei documenti e supporto agli utenti.', ['is_admin' => true]);

        $hotel = $this->azienda('azienda', 'Hotel Excelsior', 'Pescara', 'Turismo / Hospitality', 'media', 11,
            'Hotel 4 stelle sul lungomare di Pescara, 80 camere. Cerchiamo personale di sala, reception e spiaggia per la stagione 2027.');
        $molo = $this->azienda('ristorante', 'Ristorante', 'Il Molo', 'Ristorazione / HoReCa', 'piccola', 7,
            'Ristorante di pesce sul porto di Pescara, 120 coperti. Cucina abruzzese e crudi.');
        $eventi = $this->azienda('eventi', 'Adriatica', 'Eventi', 'Eventi', 'micro', 4,
            'Organizziamo matrimoni, fiere e congressi tra Abruzzo e Marche.');

        // Account per la demo: profilo dichiarato, su cui mostrare dal vivo l'upload di un documento
        $marco = $this->talento('lavoratore', 'WORKER', 'Marco', 'Ferretti', [
            'settore' => 'Ristorazione / HoReCa', 'ral_aspettativa' => '€1.000 – €1.500/mese',
            'livello_istruzione' => 'diploma', 'anni_esperienza' => 4, 'certificazioni' => 'HACCP',
            'birth_date' => '1998-03-14', 'city' => 'Pescara', 'contract_type' => 'Stagionale',
            'skills' => ['Servizio in sala', 'Vini', 'Inglese'], 'languages' => ['Italiano', 'Inglese'],
            'description' => 'Cameriere con 4 stagioni in ristoranti di pesce tra Pescara e Francavilla. Disponibile giugno–settembre.',
        ]);

        // Account per la demo: profilo certificato con rating alto
        $federica = $this->talento('professionista', 'PRO', 'Federica', 'Lombardi', [
            'settore' => 'IT / Digitale', 'ral_aspettativa' => 'Tariffa giornaliera / Freelance',
            'livello_istruzione' => 'laurea_magistrale', 'anni_esperienza' => 8,
            'certificazioni' => 'AWS Cloud Practitioner, Inglese C1, Scrum Master',
            'birth_date' => '1991-07-02', 'city' => 'Pescara', 'contract_type' => 'Partita IVA',
            'skills' => ['React', 'Laravel', 'AWS'], 'languages' => ['Italiano', 'Inglese'],
            'description' => 'Sviluppatrice full-stack freelance: siti, gestionali e app per PMI e strutture ricettive.',
        ], [
            ['istruzione', null, null, 2016],
            ['esperienza', 'Sviluppatrice full-stack, Studio Web Adriatico', 8, 2017],
            ['certificazione', 'AWS Cloud Practitioner', null, 2023],
            ['certificazione', 'Inglese C1', null, 2015],
        ]);

        $sara = $this->talento('sara', 'WORKER', 'Sara', 'Conti', [
            'settore' => 'Turismo / Hospitality', 'ral_aspettativa' => '€1.000 – €1.500/mese',
            'livello_istruzione' => 'diploma', 'anni_esperienza' => 3, 'certificazioni' => 'Brevetto bagnino FIN, BLSD',
            'birth_date' => '2001-05-20', 'city' => 'Montesilvano', 'skills' => ['Salvamento', 'Primo soccorso'],
            'description' => 'Bagnina di salvataggio, 3 stagioni in stabilimenti della costa abruzzese.',
        ], [
            ['certificazione', 'Brevetto bagnino FIN', null, 2021],
            ['certificazione', 'BLSD', null, 2024],
        ]);

        $luca = $this->talento('luca', 'PRO', 'Luca', 'Marino', [
            'settore' => 'Ristorazione / HoReCa', 'ral_aspettativa' => '€2.000 – €3.000/mese',
            'livello_istruzione' => 'diploma', 'anni_esperienza' => 12, 'certificazioni' => 'HACCP, Sommelier AIS',
            'birth_date' => '1988-11-09', 'city' => 'Pescara', 'skills' => ['Cucina di pesce', 'Pasticceria', 'Gestione brigata'],
            'description' => 'Chef de partie, 12 anni tra hotel e ristoranti. Specializzato in pesce e cucina abruzzese.',
        ], [
            ['istruzione', null, null, 2007],
            ['esperienza', 'Chef de partie, Grand Hotel Adriatico', 10, 2014],
            ['certificazione', 'HACCP', null, 2022],
        ]);

        $this->talento('giulia', 'PRO', 'Giulia', 'De Luca', [
            'settore' => 'IT / Digitale', 'ral_aspettativa' => 'Tariffa giornaliera / Freelance',
            'livello_istruzione' => 'laurea_triennale', 'anni_esperienza' => 4, 'certificazioni' => 'Adobe Certified Professional',
            'birth_date' => '1996-02-17', 'city' => 'Chieti', 'skills' => ['Grafica', 'Social media', 'Branding'],
            'description' => 'Grafica e social media manager per PMI locali.',
        ]);

        $antonio = $this->talento('antonio', 'WORKER', 'Antonio', 'Ruggieri', [
            'settore' => 'Ristorazione / HoReCa', 'ral_aspettativa' => '€1.000 – €1.500/mese',
            'livello_istruzione' => 'diploma', 'anni_esperienza' => 2, 'certificazioni' => 'AIBES',
            'birth_date' => '2002-08-30', 'city' => 'Pescara', 'skills' => ['Cocktail', 'Caffetteria'],
            'description' => 'Barista e bartender, corso AIBES. Disponibile per la stagione estiva.',
        ], [
            ['certificazione', 'AIBES', null, 2023],
        ]);

        $this->talento('chiara', 'PRO', 'Chiara', 'Santoro', [
            'settore' => 'Eventi', 'ral_aspettativa' => 'Tariffa giornaliera / Freelance',
            'livello_istruzione' => 'laurea_triennale', 'anni_esperienza' => 6, 'certificazioni' => null,
            'birth_date' => '1994-04-11', 'city' => 'Pescara', 'skills' => ['Fotografia', 'Video'],
            'description' => 'Fotografa di eventi e matrimoni.',
        ]);

        $davide = $this->talento('davide', 'WORKER', 'Davide', 'Esposito', [
            'settore' => 'Eventi', 'ral_aspettativa' => 'Meno di €1.000/mese',
            'livello_istruzione' => 'diploma', 'anni_esperienza' => 1, 'certificazioni' => 'Inglese B2',
            'birth_date' => '2004-01-25', 'city' => 'Francavilla al Mare', 'skills' => ['Accoglienza', 'Hostess'],
            'description' => 'Addetto sala e hostess per fiere e congressi, weekend e festivi.',
        ]);

        $this->talento('roberto', 'WORKER', 'Roberto', 'Mancini', [
            'settore' => 'Logistica', 'ral_aspettativa' => '€1.500 – €2.000/mese',
            'livello_istruzione' => 'licenza_media', 'anni_esperienza' => 7, 'certificazioni' => 'Patente C, Patentino muletto',
            'birth_date' => '1990-09-03', 'city' => 'San Giovanni Teatino', 'skills' => ['Magazzino', 'Muletto'],
            'description' => 'Magazziniere, patente C e patentino del muletto. Disponibile da subito.',
        ], [
            ['certificazione', 'Patentino muletto', null, 2019],
        ]);

        // Caso ambiguo per mostrare la revisione manuale: laurea a 19 anni
        $this->talento('valentina', 'WORKER', 'Valentina', 'Bruno', [
            'settore' => 'Turismo / Hospitality', 'ral_aspettativa' => '€1.500 – €2.000/mese',
            'livello_istruzione' => 'laurea_triennale', 'anni_esperienza' => 3, 'certificazioni' => 'Inglese C1, Tedesco B1',
            'birth_date' => '2003-06-12', 'city' => 'Pescara', 'skills' => ['Reception', 'Booking', 'Lingue'],
            'description' => 'Receptionist, esperienza in catene alberghiere abruzzesi.',
        ], [
            ['istruzione', null, null, 2022],
        ]);

        // Sblocchi già pagati, recensioni di chi ha sbloccato, contatti tra utenti
        foreach ([[$hotel, $sara], [$hotel, $luca], [$molo, $luca], [$molo, $antonio], [$eventi, $federica]] as [$c, $w]) {
            DB::table('unlocked_profiles')->insert(['company_id' => $c->id, 'worker_id' => $w->id, 'unlocked_at' => now()->subDays(rand(2, 20))]);
        }
        $this->recensione($hotel, $sara, 5, 'Puntuale e attenta per tutta la stagione: la richiameremo il prossimo anno.');
        $this->recensione($hotel, $luca, 5, 'Grande professionalità in cucina, gestisce la partita anche nei giorni pieni.');
        $this->recensione($molo, $luca, 4, 'Ottimo sul pesce, preciso con le schede HACCP.');
        $this->recensione($molo, $antonio, 5, 'Veloce al banco e sempre cordiale con i clienti.');
        $this->recensione($eventi, $federica, 5, 'Ha rifatto il nostro sito e il sistema di prenotazioni in tre settimane.');

        // Anche i professionisti sbloccano i lavoratori: Luca (chef) ha ingaggiato Antonio per un evento
        DB::table('unlocked_profiles')->insert(['company_id' => $luca->id, 'worker_id' => $antonio->id, 'unlocked_at' => now()->subDays(6)]);
        $this->recensione($luca, $antonio, 4, 'Ha gestito il bar a un evento privato da 80 persone, preciso e veloce.');

        // Piani dei lavoratori: Boost (primo nei risultati, badge Sponsor) e Premium
        $sara->forceFill(['abbonamento' => 'boost', 'abbonamento_scade_at' => now()->addDays(21)])->save();
        $federica->forceFill(['abbonamento' => 'premium', 'abbonamento_scade_at' => now()->addDays(12)])->save();

        // Messaggi da talenti non sbloccati: l'azienda li sblocca dalla chat per rispondere
        $this->messaggio($marco, $hotel, 'Buongiorno, ho visto l\'annuncio per camerieri di sala. Ho 4 stagioni di esperienza e HACCP, sarei disponibile da giugno.', 50);
        $this->messaggio($davide, $eventi, 'Salve, sono disponibile come hostess per la fiera di aprile, anche per tutte e 3 le giornate.', 180);
        $this->messaggio($eventi, $federica, 'Ciao Federica, ci servirebbe una modifica al modulo di prenotazione. Hai tempo questa settimana?', 300);
        $this->messaggio($federica, $eventi, 'Certo! Mandatemi i dettagli e vi faccio un preventivo entro domani.', 280);

        DB::table('company_follows')->insert(['user_id' => $marco->id, 'company_id' => $hotel->id, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('saved_profiles')->insert(['user_id' => $hotel->id, 'saved_user_id' => $marco->id, 'created_at' => now(), 'updated_at' => now()]);

        $this->post($hotel, 'job', 'Camerieri di sala · stagione 2027', 'Cerchiamo 4 camerieri per il ristorante dell\'hotel, giugno–settembre. Richiesto HACCP, gradito inglese.', 'Pescara', 'Contratto a tempo determinato', 1500, 'Mensile');
        $this->post($hotel, 'job', 'Receptionist con inglese e tedesco', 'Turni su 3 fasce, esperienza in hotel di almeno 2 anni.', 'Pescara', 'Contratto a tempo determinato', 1700, 'Mensile');
        $this->post($molo, 'job', 'Chef de partie pesce', 'Brigata di 6 persone, cucina di pesce crudo e cotto. Disponibilità serale.', 'Pescara', 'Contratto a tempo indeterminato', 2200, 'Mensile');
        $this->post($eventi, 'job', 'Hostess per fiera di aprile', '3 giornate in fiera, accoglienza e registrazione ospiti.', 'Pescara', 'A chiamata', 15, 'Ora');
        $this->post($marco, 'service', 'Cameriere disponibile estate 2027', 'Stagionale giugno–settembre in ristorante o stabilimento balneare.', 'Pescara', 'Contratto a tempo determinato', 1400, 'Mensile');
        $this->post($federica, 'service', 'Siti e gestionali per hotel e ristoranti', 'Sviluppo web su misura, prenotazioni online e integrazioni.', 'Remoto', 'Partita IVA', 300, 'Fisso');
        $this->post($sara, 'service', 'Bagnina con brevetto FIN e BLSD', 'Disponibile per la stagione 2027 sulla costa abruzzese.', 'Montesilvano', 'Contratto a tempo determinato', 1300, 'Mensile');

        $this->command?->info('Demo pronta. Password per tutti: ' . self::PASSWORD);
        $this->command?->table(['Account', 'Ruolo', 'Rating', 'Badge'], User::where('email', 'like', '%@' . self::DOMINIO)
            ->orderBy('role')->orderByDesc('rating_tecnico')->get()
            ->map(fn ($u) => [$u->email, $u->role . ($u->is_admin ? ' (admin)' : ''), $u->role === 'COMPANY' ? '—' : $u->rating_tecnico, $u->badge])->all());
    }

    private function pulisci(): void
    {
        $ids = User::where('email', 'like', '%@' . self::DOMINIO)->pluck('id');
        if ($ids->isEmpty()) {
            return;
        }

        foreach (DocumentoVerifica::whereIn('user_id', $ids)->pluck('file_path') as $path) {
            Storage::disk('local')->delete($path);
        }
        DB::table('unlocked_profiles')->whereIn('company_id', $ids)->orWhereIn('worker_id', $ids)->delete();
        DB::table('messages')->whereIn('sender_id', $ids)->orWhereIn('receiver_id', $ids)->delete();
        DB::table('notifications')->where('notifiable_type', User::class)->whereIn('notifiable_id', $ids)->delete();
        User::whereIn('id', $ids)->delete();
    }

    private function base(string $alias, string $role, string $nome, string $cognome, array $extra): User
    {
        $u = new User();
        $u->forceFill(array_merge([
            'first_name' => $nome,
            'last_name' => $cognome,
            'email' => "$alias@" . self::DOMINIO,
            'password' => Hash::make(self::PASSWORD),
            'has_password' => true,
            'email_verified_at' => now(),
            'role' => $role,
            'onboarding_completato' => true,
            'badge' => 'grigio',
            'available' => true,
            'curriculum_public' => true,
            'country' => 'Italia',
        ], $extra))->save();

        return $u;
    }

    private function azienda(string $alias, string $nome, string $cognome, string $settore, string $dimensione, int $anni, string $descrizione, array $extra = []): User
    {
        return $this->base($alias, 'COMPANY', $nome, $cognome, array_merge([
            'settore' => $settore,
            'dimensione_azienda' => $dimensione,
            'anni_esperienza' => $anni,
            'description' => $descrizione,
            'city' => 'Pescara',
            'ral_aspettativa' => '€1.500 – €2.000/mese',
        ], $extra));
    }

    /** @param array<array{0:string,1:?string,2:?int,3:?int}> $documenti [tipo, riferimento, anni, anno] */
    private function talento(string $alias, string $role, string $nome, string $cognome, array $dati, array $documenti = []): User
    {
        $u = $this->base($alias, $role, $nome, $cognome, array_merge($dati, [
            'years_experience' => $dati['anni_esperienza'],
            // Curriculum privato: nome e contatti si vedono solo dopo lo sblocco a pagamento
            'curriculum_public' => false,
        ]));
        RatingTecnico::aggiorna($u, 'Rating iniziale generato dall\'onboarding');

        foreach ($documenti as [$tipo, $riferimento, $anni, $anno]) {
            $riferimento = $tipo === 'istruzione' ? $u->livello_istruzione : $riferimento;
            $descrizione = $tipo === 'istruzione' ? RatingTecnico::ISTRUZIONE_LABEL[$riferimento] : $riferimento;
            $contenuto = self::pdf("Documento dimostrativo HireWave\n$nome $cognome\n$descrizione" . ($anno ? " ($anno)" : ''));
            $path = "documenti/{$u->id}/demo-" . uniqid() . '.pdf';
            Storage::disk('local')->put($path, $contenuto);

            $doc = new DocumentoVerifica(['tipo' => $tipo, 'riferimento' => $riferimento, 'anni' => $anni, 'anno' => $anno]);
            $doc->forceFill([
                'user_id' => $u->id,
                'file_path' => $path,
                'nome_file' => \Illuminate\Support\Str::slug($descrizione) . '.pdf',
                'mime' => 'application/pdf',
                'dimensione' => strlen($contenuto),
                'hash' => hash('sha256', $contenuto),
                'stato' => 'in_verifica',
            ])->save();

            VerificaDocumenti::verifica($doc);
        }

        return $u->fresh();
    }

    private function recensione(User $azienda, User $talento, int $stelle, string $testo): void
    {
        Review::create(['reviewer_id' => $azienda->id, 'worker_id' => $talento->id, 'stars' => $stelle, 'comment' => $testo]);
        $talento->forceFill(['rating_reputazionale' => round(Review::where('worker_id', $talento->id)->avg('stars'), 1)])->save();
    }

    private function messaggio(User $da, User $a, string $testo, int $minutiFa): void
    {
        $quando = now()->subMinutes($minutiFa);
        DB::table('messages')->insert(['sender_id' => $da->id, 'receiver_id' => $a->id, 'body' => $testo, 'created_at' => $quando, 'updated_at' => $quando]);
    }

    private function post(User $autore, string $tipo, string $titolo, string $testo, string $luogo, string $contratto, int $budget, string $budgetTipo): void
    {
        Post::create([
            'user_id' => $autore->id, 'type' => $tipo, 'title' => $titolo, 'description' => $testo,
            'location' => $luogo, 'contract_type' => $contratto, 'budget' => $budget,
            'budget_type' => $budgetTipo, 'sponsored' => false,
        ]);
    }

    /** PDF valido di una pagina, sopra la dimensione minima di una scansione */
    private static function pdf(string $testo): string
    {
        $righe = array_map(fn ($r) => '(' . str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $r) . ') Tj 0 -22 Td', explode("\n", $testo));
        $stream = "BT /F1 16 Tf 72 760 Td " . implode(' ', $righe) . " ET";
        $oggetti = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
            "<< /Length " . strlen($stream) . " >>\nstream\n$stream\nendstream",
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        ];

        // Commento di riempimento: rende ogni file unico e sopra i 5 KB
        $pdf = "%PDF-1.4\n%" . str_repeat('HireWave demo ' . bin2hex(random_bytes(8)) . ' ', 200) . "\n";
        $offset = [];
        foreach ($oggetti as $i => $o) {
            $offset[] = strlen($pdf);
            $pdf .= ($i + 1) . " 0 obj\n$o\nendobj\n";
        }
        $xref = strlen($pdf);
        $pdf .= "xref\n0 " . (count($oggetti) + 1) . "\n0000000000 65535 f \n";
        foreach ($offset as $o) {
            $pdf .= sprintf("%010d 00000 n \n", $o);
        }

        return $pdf . "trailer\n<< /Size " . (count($oggetti) + 1) . " /Root 1 0 R >>\nstartxref\n$xref\n%%EOF\n";
    }
}
