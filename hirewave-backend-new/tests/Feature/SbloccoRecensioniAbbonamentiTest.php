<?php

namespace Tests\Feature;

use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Recensioni solo da chi ha sbloccato, sblocco anche per i professionisti e
 * dalla chat, piani Premium/Boost e tutor.
 *
 * Gira su un database MySQL separato (hirewave_test), vedi tests/README.md.
 * Stripe non è configurato nei test: si usa la modalità demo (ambiente local).
 */
class SbloccoRecensioniAbbonamentiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.stripe.secret' => null]);
        $this->app->detectEnvironment(fn () => 'local');
        // Fuori dall'ambiente di test Laravel riattiva il CSRF, che qui non c'entra
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class);
    }

    private function talento(string $role = 'WORKER', array $extra = []): User
    {
        return User::factory()->create(array_merge([
            'role' => $role, 'onboarding_completato' => true, 'badge' => 'grigio',
            'livello_istruzione' => 'diploma', 'anni_esperienza' => 3, 'rating_tecnico' => 40,
            'settore' => 'Ristorazione / HoReCa',
        ], $extra));
    }

    private function come(User $u, string $method, string $url, array $data = [])
    {
        return $this->actingAs($u)->json($method, $url, $data);
    }

    private function recensisci(User $da, User $a)
    {
        return $this->come($da, 'POST', "/api/profiles/{$a->id}/reviews", ['stars' => 5, 'comment' => 'Ottimo lavoro, puntuale.']);
    }

    public function test_recensione_solo_dopo_lo_sblocco(): void
    {
        $azienda = User::factory()->company()->create();
        $altro = $this->talento();
        $worker = $this->talento();

        $this->recensisci($azienda, $worker)->assertStatus(403);
        $this->recensisci($altro, $worker)->assertStatus(403);

        $this->come($azienda, 'POST', '/api/stripe/checkout', ['worker_id' => $worker->id])->assertOk()->assertJson(['demo' => true]);
        $this->recensisci($azienda, $worker)->assertCreated();
        $this->assertSame(5.0, $worker->fresh()->rating_reputazionale);

        // Resta possibile anche a sblocco scaduto: la recensione arriva dopo l'ingaggio
        DB::table('unlocked_profiles')->update(['unlocked_at' => now()->subDays(60)]);
        $this->recensisci($azienda, $worker)->assertCreated();
    }

    public function test_le_aziende_non_si_recensiscono(): void
    {
        $azienda = User::factory()->company()->create();
        $this->recensisci($this->talento(), $azienda)->assertStatus(403);
    }

    public function test_il_professionista_sblocca_un_lavoratore_ma_non_un_altro_professionista(): void
    {
        $pro = $this->talento('PRO');
        $worker = $this->talento();
        $altroPro = $this->talento('PRO');

        $this->come($pro, 'GET', "/api/profile/{$worker->id}")->assertJsonPath('user.can_unlock', true)->assertJsonPath('user.last_name', null);
        $this->come($pro, 'POST', '/api/stripe/checkout', ['worker_id' => $altroPro->id])->assertStatus(403);
        $this->come($worker, 'POST', '/api/stripe/checkout', ['worker_id' => $pro->id])->assertStatus(403);

        $this->come($pro, 'POST', '/api/stripe/checkout', ['worker_id' => $worker->id, 'ritorno' => 'profile'])->assertOk();
        $this->come($pro, 'GET', "/api/profile/{$worker->id}")
            ->assertJsonPath('user.last_name', $worker->last_name)
            ->assertJsonPath('user.can_review', true);
        $this->recensisci($pro, $worker)->assertCreated();
    }

    public function test_sblocco_dalla_chat_per_rispondere(): void
    {
        $azienda = User::factory()->company()->create();
        $worker = $this->talento('WORKER', ['badge' => 'verde']);
        Message::create(['sender_id' => $worker->id, 'receiver_id' => $azienda->id, 'body' => 'Salve, sono interessato']);

        $this->come($azienda, 'GET', "/api/messages/{$worker->id}")
            ->assertJsonPath('can_send', false)
            ->assertJsonPath('sblocco.prezzo', 2999)
            ->assertJsonPath('sblocco.rating_tecnico', 40);
        $this->come($azienda, 'POST', "/api/messages/{$worker->id}", ['body' => 'Ciao'])->assertStatus(403);

        $this->come($azienda, 'POST', '/api/stripe/checkout', ['worker_id' => $worker->id, 'ritorno' => 'chat'])
            ->assertOk()->assertJsonPath('url', fn ($u) => str_ends_with($u, "/chat?to={$worker->id}"));

        $this->come($azienda, 'GET', "/api/messages/{$worker->id}")->assertJsonPath('can_send', true)->assertJsonPath('sblocco', null);
        $this->come($azienda, 'POST', "/api/messages/{$worker->id}", ['body' => 'Ciao, quando possiamo sentirci?'])->assertCreated();
    }

    public function test_boost_e_premium_in_cima_ai_talenti(): void
    {
        $azienda = User::factory()->company()->create();
        $alto = $this->talento('WORKER', ['rating_tecnico' => 90]);
        $premium = $this->talento('WORKER', ['rating_tecnico' => 30]);
        $boost = $this->talento('WORKER', ['rating_tecnico' => 20]);

        $this->come($premium, 'POST', '/api/abbonamento', ['piano' => 'premium'])->assertOk()->assertJsonPath('abbonamento.piano', 'premium');
        $this->come($boost, 'POST', '/api/abbonamento', ['piano' => 'boost'])->assertOk();

        $ids = array_column($this->come($azienda, 'GET', '/api/talents')->json(), 'id');
        $this->assertSame([$boost->id, $premium->id, $alto->id], array_slice($ids, 0, 3));

        // Scaduto o disdetto torna Free
        $this->come($boost, 'DELETE', '/api/abbonamento')->assertJsonPath('abbonamento.piano', null);
        $premium->forceFill(['abbonamento_scade_at' => now()->subDay()])->save();
        $ids = array_column($this->come($azienda, 'GET', '/api/talents')->json(), 'id');
        $this->assertSame($alto->id, $ids[0]);
    }

    public function test_le_aziende_non_hanno_abbonamenti(): void
    {
        $this->come(User::factory()->company()->create(), 'POST', '/api/abbonamento', ['piano' => 'boost'])->assertStatus(403);
    }

    public function test_tutor_risponde_con_i_dati_del_profilo_e_limita_il_free(): void
    {
        $worker = $this->talento();
        \App\Support\RatingTecnico::aggiorna($worker, 'test');
        $rating = $worker->fresh()->rating_tecnico;

        $this->come($worker, 'POST', '/api/tutor', ['testo' => 'Perché ho questo rating?'])
            ->assertOk()
            ->assertJsonPath('testo', fn ($t) => str_contains($t, "$rating/100"))
            ->assertJsonPath('limite.usate', 1);

        for ($i = 1; $i < 15; $i++) {
            $this->come($worker, 'POST', '/api/tutor', ['testo' => 'Come aumento il rating?'])->assertOk();
        }
        $this->come($worker, 'POST', '/api/tutor', ['testo' => 'ancora una'])->assertStatus(429);

        // Premium: illimitato
        $this->come($worker, 'POST', '/api/abbonamento', ['piano' => 'premium']);
        $this->come($worker, 'POST', '/api/tutor', ['testo' => 'La mia retribuzione è giusta?'])->assertOk()->assertJsonPath('limite', null);
        $this->assertCount(17 * 2 - 2, DB::table('tutor_messaggi')->where('user_id', $worker->id)->get());
    }

    public function test_tutor_azienda_prepara_la_shortlist(): void
    {
        $azienda = User::factory()->company()->create();
        $chef = $this->talento('PRO', ['rating_tecnico' => 70, 'badge' => 'verde', 'description' => 'Chef di cucina di pesce']);
        $this->talento('WORKER', ['rating_tecnico' => 50, 'description' => 'Magazziniere con muletto', 'settore' => 'Logistica']);

        $res = $this->come($azienda, 'POST', '/api/tutor', ['testo' => 'Cerco un cuoco certificato'])->assertOk();
        $this->assertStringContainsString("{$chef->first_name} · rating 70/100 · Certificato", $res->json('testo'));
        $this->assertStringContainsString('€29,99', $res->json('testo'));
        $this->assertStringNotContainsString('Magazzin', $res->json('testo'));
        $this->assertNull($res->json('limite'));
    }
}
