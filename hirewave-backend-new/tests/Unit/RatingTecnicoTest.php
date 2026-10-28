<?php

namespace Tests\Unit;

use App\Models\DocumentoVerifica;
use App\Models\User;
use App\Support\RatingTecnico;
use Tests\TestCase;

// Solo calcolo: i documenti si passano a mano, nessun database
class RatingTecnicoTest extends TestCase
{
    private function utente(?string $livello, int $anni, ?string $cert): User
    {
        $u = new User();
        $u->forceFill([
            'role' => 'WORKER',
            'onboarding_completato' => true,
            'livello_istruzione' => $livello,
            'anni_esperienza' => $anni,
            'certificazioni' => $cert,
        ]);
        return $u;
    }

    private function doc(string $tipo, ?string $rif, ?int $anni = null, string $stato = 'verificato'): DocumentoVerifica
    {
        $d = new DocumentoVerifica();
        $d->forceFill(['tipo' => $tipo, 'riferimento' => $rif, 'anni' => $anni, 'stato' => $stato]);
        return $d;
    }

    public function test_scala_esperienza_senza_scalini_piatti(): void
    {
        $attesi = [0 => 0, 1 => 6, 3 => 18, 5 => 30, 6 => 32, 9 => 38, 10 => 40, 30 => 40];
        foreach ($attesi as $anni => $punti) {
            $this->assertSame($punti, RatingTecnico::puntiEsperienza($anni), "$anni anni");
        }
    }

    public function test_certificazioni_dal_testo_libero(): void
    {
        $this->assertSame([], RatingTecnico::certificazioniDa('no'));
        $this->assertSame([], RatingTecnico::certificazioniDa('Nessuna'));
        $this->assertSame([], RatingTecnico::certificazioniDa(null));
        $this->assertSame(['HACCP', 'BLSD'], RatingTecnico::certificazioniDa('HACCP, BLSD; haccp'));
        $this->assertSame(['HACCP', 'Inglese B2'], RatingTecnico::certificazioniDa("HACCP\n  Inglese   B2 "));
    }

    public function test_tutto_dichiarato_arriva_al_massimo_a_80(): void
    {
        $u = $this->utente('laurea_magistrale', 12, 'HACCP, BLSD, Inglese C1, Patente C');
        $d = RatingTecnico::dettaglio($u, collect());

        $this->assertSame(80, $d['totale']);
        $this->assertSame([24, 32, 24], array_column($d['voci'], 'punti'));
        // La quarta certificazione non conta
        $this->assertSame('oltre_limite', $d['voci'][2]['elementi'][3]['stato']);
    }

    public function test_tutto_verificato_arriva_a_100(): void
    {
        $u = $this->utente('laurea_magistrale', 10, 'HACCP, BLSD, Inglese C1');
        $docs = collect([
            $this->doc('istruzione', 'laurea_magistrale'),
            $this->doc('esperienza', 'Hotel', 10),
            $this->doc('certificazione', 'haccp'),
            $this->doc('certificazione', 'BLSD'),
            $this->doc('certificazione', 'Inglese C1'),
        ]);

        $d = RatingTecnico::dettaglio($u, $docs);
        $this->assertSame(100, $d['totale']);
        $this->assertSame(['verificato', 'verificato', 'verificato'], array_column($d['voci'], 'stato'));
        $this->assertSame([], $d['consigli']);
    }

    public function test_esperienza_verificata_in_parte(): void
    {
        // 7 anni = 34 punti pieni; 5 verificati = 30, gli altri 4 punti all'80% = 3,2
        $d = RatingTecnico::dettaglio($this->utente(null, 7, null), collect([$this->doc('esperienza', 'Bar', 5)]));
        $esp = $d['voci'][1];

        $this->assertSame(33, $esp['punti']);
        $this->assertSame('parziale', $esp['stato']);
        $this->assertSame(5, $esp['anni_verificati']);
    }

    public function test_i_vecchi_paradossi_non_esistono_piu(): void
    {
        // Prima: "no" valeva 30 punti e la licenza media batteva la laurea magistrale
        $licenzaConNo = RatingTecnico::calcola($this->utente('licenza_media', 0, 'no'), collect());
        $magistrale = RatingTecnico::calcola($this->utente('laurea_magistrale', 0, null), collect());
        $this->assertSame(5, $licenzaConNo);
        $this->assertSame(24, $magistrale);

        // Prima: senza titolo 10 punti, più della licenza media (5)
        $senzaTitolo = RatingTecnico::calcola($this->utente(null, 0, null), collect());
        $this->assertSame(0, $senzaTitolo);
    }

    public function test_documenti_non_verificati_non_contano_ma_si_vedono(): void
    {
        $u = $this->utente('diploma', 2, 'HACCP');
        $docs = collect([
            $this->doc('istruzione', 'diploma', null, 'in_verifica'),
            $this->doc('certificazione', 'HACCP', null, 'rifiutato'),
        ]);
        $d = RatingTecnico::dettaglio($u, $docs);

        $this->assertSame('dichiarato', $d['voci'][0]['stato']);
        $this->assertTrue($d['voci'][0]['in_verifica']);
        $this->assertSame(12 + 10 + 10, $d['totale']);
        $this->assertFalse($d['verificato']);
    }

    public function test_titolo_verificato_vale_solo_se_coincide_con_quello_dichiarato(): void
    {
        $u = $this->utente('laurea_magistrale', 0, null);
        $d = RatingTecnico::dettaglio($u, collect([$this->doc('istruzione', 'diploma')]));
        $this->assertSame('dichiarato', $d['voci'][0]['stato']);
        $this->assertSame(24, $d['totale']);
    }

    public function test_la_somma_delle_voci_e_sempre_il_totale(): void
    {
        foreach (array_keys(RatingTecnico::ISTRUZIONE) as $livello) {
            foreach ([0, 1, 2, 4, 5, 7, 10, 15] as $anni) {
                foreach ([null, 'A', 'A, B', 'A, B, C', 'A, B, C, D'] as $cert) {
                    $d = RatingTecnico::dettaglio($this->utente($livello, $anni, $cert), collect());
                    $this->assertSame($d['totale'], array_sum(array_column($d['voci'], 'punti')));
                    $this->assertLessThanOrEqual(80, $d['totale']);
                }
            }
        }
    }

    public function test_consigli_ordinati_per_punti(): void
    {
        $d = RatingTecnico::dettaglio($this->utente('laurea_magistrale', 3, null), collect());
        $punti = array_column($d['consigli'], 'punti');

        $this->assertCount(3, $d['consigli']);
        $this->assertSame($punti, array_values(collect($punti)->sortDesc()->all()));
        // Verificare la laurea: 30 - 24 = +6. Aggiungere la prima certificazione: 12 × 0,8 = +10
        $this->assertSame(10, $d['consigli'][0]['punti']);
    }

    public function test_versione_pubblica_nasconde_i_nomi_delle_certificazioni(): void
    {
        $d = RatingTecnico::dettaglio($this->utente('diploma', 2, 'HACCP, BLSD'), collect());
        $pub = RatingTecnico::pubblico($d, false);

        $this->assertArrayNotHasKey('consigli', $pub);
        $this->assertSame('2 certificazioni', $pub['voci'][2]['valore']);
        $this->assertNull($pub['voci'][2]['elementi'][0]['nome']);
        $this->assertSame($d['totale'], $pub['totale']);
    }
}
