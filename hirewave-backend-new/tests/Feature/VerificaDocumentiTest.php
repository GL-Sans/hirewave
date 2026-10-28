<?php

namespace Tests\Feature;

use App\Models\DocumentoVerifica;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Flusso completo: upload → verifica → badge verde → rating ricalcolato,
 * dato bloccato, revisione manuale, Verifica Premium per le aziende.
 *
 * Gira su un database MySQL separato (hirewave_test), vedi tests/README.md.
 */
class VerificaDocumentiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    private function lavoratore(array $extra = []): User
    {
        return User::factory()->create(array_merge([
            'onboarding_completato' => true,
            'badge' => 'grigio',
            'livello_istruzione' => 'diploma',
            'anni_esperienza' => 4,
            'years_experience' => 4,
            'certificazioni' => 'HACCP',
            'birth_date' => '1995-05-10',
            'rating_tecnico' => 0,
        ], $extra));
    }

    private function pdf(string $nome = 'doc.pdf', int $kb = 60): UploadedFile
    {
        return UploadedFile::fake()->create($nome, $kb, 'application/pdf');
    }

    private function carica(User $u, array $dati, ?UploadedFile $file = null)
    {
        return $this->actingAs($u)->post('/api/me/documenti', array_merge([
            'file' => $file ?? $this->pdf(),
            'conferma' => '1',
        ], $dati), ['Accept' => 'application/json']);
    }

    public function test_titolo_verificato_da_badge_verde_e_alza_il_rating(): void
    {
        $u = $this->lavoratore();
        \App\Support\RatingTecnico::aggiorna($u, 'test');
        $prima = $u->fresh()->rating_tecnico; // 12 + 19 + 10 = 41

        $res = $this->carica($u, ['tipo' => 'istruzione', 'anno' => 2014]);

        $res->assertCreated()->assertJsonPath('documento.stato', 'verificato');
        $u->refresh();
        $this->assertSame('verde', $u->badge);
        $this->assertSame($prima + 3, $u->rating_tecnico); // diploma da 12 a 15
        $this->assertDatabaseHas('rating_storico', ['user_id' => $u->id, 'valore' => $u->rating_tecnico, 'motivo' => 'Documento verificato: Diploma']);
        $this->assertSame(1, $u->notifications()->count());
    }

    public function test_serve_la_conferma_del_blocco(): void
    {
        $u = $this->lavoratore();
        $this->actingAs($u)->post('/api/me/documenti', ['tipo' => 'istruzione', 'anno' => 2014, 'file' => $this->pdf()], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors('conferma');
    }

    public function test_titolo_conseguito_troppo_giovane_va_in_revisione_e_lo_decide_un_admin(): void
    {
        $u = $this->lavoratore(['livello_istruzione' => 'laurea_magistrale']);
        $admin = User::factory()->create(['is_admin' => true]);

        $res = $this->carica($u, ['tipo' => 'istruzione', 'anno' => 2012]); // a 17 anni
        $res->assertCreated()->assertJsonPath('documento.stato', 'revisione_manuale');
        $id = $res->json('documento.id');
        $this->assertSame('grigio', $u->fresh()->badge);
        $this->assertSame(1, $admin->notifications()->count());

        // Mentre è in revisione il titolo non si può cambiare
        $this->actingAs($u)->putJson('/api/me/curriculum', ['livello_istruzione' => 'diploma'])
            ->assertStatus(422)->assertJsonValidationErrors('livello_istruzione');

        // Un utente normale non vede l'area di revisione
        $this->actingAs($u)->getJson('/api/admin/documenti')->assertNotFound();

        $this->actingAs($admin)->getJson('/api/admin/documenti')->assertOk()->assertJsonCount(1);
        $this->actingAs($admin)->postJson("/api/admin/documenti/$id/esito", ['approvato' => true, 'nota' => 'Laurea anticipata, verificato con l\'ateneo.'])
            ->assertOk()->assertJsonPath('documento.stato', 'verificato');

        $this->assertSame('verde', $u->fresh()->badge);
    }

    public function test_si_verifica_sempre_il_titolo_dichiarato_nel_profilo(): void
    {
        $u = $this->lavoratore();
        // Il riferimento arriva dal profilo: anche se il client manda altro, si verifica il titolo dichiarato
        $this->carica($u, ['tipo' => 'istruzione', 'anno' => 2014, 'riferimento' => 'laurea_magistrale'])
            ->assertCreated()->assertJsonPath('documento.riferimento', 'diploma');
    }

    public function test_file_troppo_piccolo_rifiutato(): void
    {
        $u = $this->lavoratore();
        $this->carica($u, ['tipo' => 'istruzione', 'anno' => 2014], $this->pdf('mini.pdf', 1))
            ->assertCreated()->assertJsonPath('documento.stato', 'rifiutato');
        $this->assertSame('grigio', $u->fresh()->badge);
    }

    public function test_esperienza_verificata_in_parte(): void
    {
        $u = $this->lavoratore(['anni_esperienza' => 7, 'years_experience' => 7]);
        $res = $this->carica($u, ['tipo' => 'esperienza', 'anni' => 5, 'anno' => 2019, 'riferimento' => 'Hotel Excelsior']);

        $res->assertCreated()->assertJsonPath('documento.stato', 'verificato');
        $esp = collect($res->json('rating_dettaglio.voci'))->firstWhere('chiave', 'esperienza');
        $this->assertSame('parziale', $esp['stato']);
        $this->assertSame(5, $esp['anni_verificati']);
    }

    public function test_esperienza_impossibile_rifiutata(): void
    {
        $u = $this->lavoratore();
        $this->carica($u, ['tipo' => 'esperienza', 'anni' => 4, 'anno' => now()->year])
            ->assertCreated()->assertJsonPath('documento.stato', 'rifiutato');
    }

    public function test_certificazione_nuova_entra_nel_profilo_e_si_verifica(): void
    {
        $u = $this->lavoratore();
        $this->carica($u, ['tipo' => 'certificazione', 'riferimento' => 'BLSD', 'anno' => 2022])
            ->assertCreated()->assertJsonPath('documento.stato', 'verificato');

        $this->assertSame('HACCP, BLSD', $u->fresh()->certificazioni);
    }

    public function test_stesso_file_di_un_altro_utente_va_in_revisione(): void
    {
        $file = $this->pdf('diploma.pdf');
        $a = $this->lavoratore();
        $b = $this->lavoratore();

        $this->carica($a, ['tipo' => 'istruzione', 'anno' => 2014], $file)->assertJsonPath('documento.stato', 'verificato');
        $this->carica($b, ['tipo' => 'istruzione', 'anno' => 2014], $file)->assertJsonPath('documento.stato', 'revisione_manuale');
    }

    public function test_eliminare_un_documento_verificato_riporta_il_badge_grigio(): void
    {
        $u = $this->lavoratore();
        $id = $this->carica($u, ['tipo' => 'istruzione', 'anno' => 2014])->json('documento.id');
        $this->assertSame('verde', $u->fresh()->badge);

        $this->actingAs($u)->deleteJson("/api/me/documenti/$id")->assertOk();
        $this->assertSame('grigio', $u->fresh()->badge);
        $this->assertDatabaseMissing('documenti_verifica', ['id' => $id]);
    }

    public function test_altri_utenti_non_vedono_ne_cancellano_i_documenti(): void
    {
        $u = $this->lavoratore();
        $altro = $this->lavoratore();
        $id = $this->carica($u, ['tipo' => 'istruzione', 'anno' => 2014])->json('documento.id');

        $this->actingAs($altro)->get("/api/documenti/$id/file")->assertNotFound();
        $this->actingAs($altro)->deleteJson("/api/me/documenti/$id")->assertNotFound();
        $this->actingAs($u)->get("/api/documenti/$id/file")->assertOk();
    }

    public function test_verifica_premium_apre_i_documenti_all_azienda(): void
    {
        config(['services.stripe.secret' => null]); // modalità demo locale
        $this->app->detectEnvironment(fn () => 'local');
        // Fuori dall'ambiente di test Laravel riattiva il CSRF, che qui non c'entra
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class);

        $u = $this->lavoratore();
        $azienda = User::factory()->company()->create(['onboarding_completato' => true]);
        $id = $this->carica($u, ['tipo' => 'istruzione', 'anno' => 2014])->json('documento.id');

        // Prima dello sblocco: niente documenti, niente Verifica Premium
        $this->actingAs($azienda)->getJson("/api/profile/{$u->id}")
            ->assertJsonPath('user.documenti', null)
            ->assertJsonPath('user.verifica_premium_disponibile', false)
            ->assertJsonPath('user.livello_istruzione', 'diploma')
            ->assertJsonPath('user.rating_dettaglio.voci.2.elementi.0.nome', null);
        $this->actingAs($azienda)->postJson('/api/stripe/checkout', ['worker_id' => $u->id, 'prodotto' => 'verifica_premium'])
            ->assertStatus(422);
        $this->actingAs($azienda)->get("/api/documenti/$id/file")->assertNotFound();

        $this->actingAs($azienda)->postJson('/api/stripe/checkout', ['worker_id' => $u->id])->assertOk();
        $this->actingAs($azienda)->getJson("/api/profile/{$u->id}")
            ->assertJsonPath('user.verifica_premium_disponibile', true)
            ->assertJsonPath('user.rating_dettaglio.voci.2.elementi.0.nome', 'HACCP');

        $this->actingAs($azienda)->postJson('/api/stripe/checkout', ['worker_id' => $u->id, 'prodotto' => 'verifica_premium'])
            ->assertOk();
        $this->assertTrue(DB::table('accessi_documenti')->where('company_id', $azienda->id)->exists());

        $this->actingAs($azienda)->getJson("/api/profile/{$u->id}")
            ->assertJsonPath('user.verifica_premium', true)
            ->assertJsonCount(1, 'user.documenti');
        $this->actingAs($azienda)->get("/api/documenti/$id/file")->assertOk();
    }

    public function test_aziende_non_caricano_documenti(): void
    {
        $azienda = User::factory()->company()->create(['onboarding_completato' => true]);
        $this->carica($azienda, ['tipo' => 'istruzione', 'anno' => 2014])->assertForbidden();
    }

    public function test_curriculum_ricalcola_e_registra_il_motivo(): void
    {
        $u = $this->lavoratore();
        \App\Support\RatingTecnico::aggiorna($u, 'test');

        $this->actingAs($u)->putJson('/api/me/curriculum', [
            'years_experience' => 6,
            'livello_istruzione' => 'laurea_triennale',
            'certificazioni' => 'HACCP, BLSD',
        ])->assertOk();

        $u->refresh();
        // 18 (triennale 23 × 0,8) + 26 (6 anni = 32 × 0,8) + 17 (HACCP 10 + BLSD 7)
        $this->assertSame(61, $u->rating_tecnico);
        $motivo = DB::table('rating_storico')->where('user_id', $u->id)->orderByDesc('id')->value('motivo');
        $this->assertStringContainsString('esperienza da 4 a 6 anni', $motivo);
        $this->assertStringContainsString('Laurea triennale', $motivo);

        $me = $this->actingAs($u)->getJson('/api/me')->assertOk();
        $this->assertSame(61, $me->json('rating_dettaglio.totale'));
        $this->assertNotEmpty($me->json('rating_storico'));
    }
}
