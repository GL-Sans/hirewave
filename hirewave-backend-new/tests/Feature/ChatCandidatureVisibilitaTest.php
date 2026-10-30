<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Chat a messaggi preimpostati prima dello sblocco, candidature, visibilità
 * del curriculum, indicatore di mercato, sblocchi gratuiti, Premium annuale,
 * media ponderata delle recensioni, percorso stagionale.
 *
 * Gira su un database MySQL separato (hirewave_test), vedi tests/README.md.
 */
class ChatCandidatureVisibilitaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.stripe.secret' => null, 'hirewave.sblocchi_gratuiti' => 0]);
        $this->app->detectEnvironment(fn () => 'local');
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class);
    }

    private function talento(string $role = 'WORKER', array $extra = []): User
    {
        return User::factory()->create(array_merge([
            'role' => $role, 'onboarding_completato' => true, 'badge' => 'grigio',
            'livello_istruzione' => 'diploma', 'anni_esperienza' => 3, 'rating_tecnico' => 40,
            'settore' => 'Ristorazione / HoReCa', 'ral_aspettativa' => '€1.000 – €1.500/mese',
        ], $extra));
    }

    private function come(User $u, string $method, string $url, array $data = [])
    {
        return $this->actingAs($u)->json($method, $url, $data);
    }

    private function annuncio(User $azienda, int $budget = 1300): Post
    {
        return Post::create([
            'user_id' => $azienda->id, 'type' => 'job', 'title' => 'Cameriere', 'budget' => $budget,
            'budget_type' => 'Mensile', 'sponsored' => false,
        ]);
    }

    public function test_senza_sblocco_nessuno_scrive_liberamente(): void
    {
        $azienda = User::factory()->company()->create();
        $pro = $this->talento('PRO');
        $worker = $this->talento();

        // Né il lavoratore verso l'azienda, né il professionista verso il lavoratore
        $this->come($worker, 'POST', "/api/messages/{$azienda->id}", ['body' => 'Il mio numero è 333…'])->assertStatus(403);
        $this->come($pro, 'POST', "/api/messages/{$worker->id}", ['body' => 'Scrivimi su WhatsApp'])->assertStatus(403);

        // Messaggi preimpostati: sì, ma solo quelli del proprio elenco
        $this->come($worker, 'GET', "/api/messages/{$azienda->id}")->assertJsonPath('can_send', false)->assertJsonPath('preset.0.id', 'interessato');
        $this->come($worker, 'POST', "/api/messages/{$azienda->id}", ['preset' => 'disponibile'])->assertCreated();
        $this->come($worker, 'POST', "/api/messages/{$azienda->id}", ['preset' => 'interesse'])->assertStatus(403);
        $this->come($pro, 'POST', "/api/messages/{$worker->id}", ['preset' => 'interesse'])->assertCreated();

        // Lo sblocco del professionista apre la chat in entrambe le direzioni
        $this->come($pro, 'POST', '/api/stripe/checkout', ['worker_id' => $worker->id])->assertOk();
        $this->come($pro, 'POST', "/api/messages/{$worker->id}", ['body' => 'Ciao, ti chiamo domani'])->assertCreated();
        $this->come($worker, 'POST', "/api/messages/{$pro->id}", ['body' => 'Perfetto, a domani'])->assertCreated();
        $this->come($pro, 'GET', "/api/profile/{$worker->id}")->assertJsonPath('user.chat_libera', true);
    }

    public function test_contatti_e_curriculum_solo_dopo_lo_sblocco(): void
    {
        $azienda = User::factory()->company()->create();
        $worker = $this->talento('WORKER', [
            'curriculum_public' => false, 'phone' => '3331234567', 'skills' => ['Sala'],
            'istituto' => 'Istituto alberghiero De Cecco', 'anno_titolo' => 2015,
            'zona' => 'Pescara e provincia', 'disponibilita_da' => '2027-06-01', 'available' => true,
        ]);

        $this->come($azienda, 'GET', "/api/profile/{$worker->id}")
            ->assertJsonPath('user.email', null)
            ->assertJsonPath('user.phone', null)
            ->assertJsonPath('user.skills', null)
            ->assertJsonPath('user.istituto', null)
            ->assertJsonPath('user.curriculum_completo', false)
            ->assertJsonPath('user.curriculum_sbloccabile', true)
            // Disponibilità sempre visibile
            ->assertJsonPath('user.zona', 'Pescara e provincia')
            ->assertJsonPath('user.disponibilita_da', '2027-06-01');

        // Curriculum pubblico: le competenze sì, i contatti mai
        $worker->forceFill(['curriculum_public' => true])->save();
        $this->come($azienda, 'GET', "/api/profile/{$worker->id}")
            ->assertJsonPath('user.skills', ['Sala'])
            ->assertJsonPath('user.email', null);
        $worker->forceFill(['curriculum_public' => false])->save();

        $this->come($azienda, 'POST', '/api/stripe/checkout', ['worker_id' => $worker->id])->assertOk();
        $this->come($azienda, 'GET', "/api/profile/{$worker->id}")
            ->assertJsonPath('user.email', $worker->email)
            ->assertJsonPath('user.phone', '3331234567')
            ->assertJsonPath('user.skills', ['Sala'])
            ->assertJsonPath('user.istituto', 'Istituto alberghiero De Cecco')
            ->assertJsonPath('user.anno_titolo', 2015)
            ->assertJsonPath('user.curriculum_completo', true);
    }

    public function test_cv_scaricabile_solo_da_chi_ha_sbloccato(): void
    {
        \Illuminate\Support\Facades\Storage::fake('local');
        $azienda = User::factory()->company()->create();
        $worker = $this->talento();
        \Illuminate\Support\Facades\Storage::disk('local')->put('cvs/cv.pdf', 'curriculum');
        $worker->forceFill(['cv' => 'cvs/cv.pdf'])->save();

        $this->actingAs($azienda)->get("/api/profiles/{$worker->id}/cv")->assertNotFound();
        $this->come($azienda, 'POST', '/api/stripe/checkout', ['worker_id' => $worker->id])->assertOk();
        $this->come($azienda, 'GET', "/api/profile/{$worker->id}")->assertJsonPath('user.has_cv', true);
        $this->actingAs($azienda)->get("/api/profiles/{$worker->id}/cv")->assertOk();
    }

    public function test_candidatura_compare_tra_le_inviate_e_tra_le_ricevute(): void
    {
        $azienda = User::factory()->company()->create();
        $worker = $this->talento();
        $post = $this->annuncio($azienda);

        $this->come($worker, 'POST', "/api/posts/{$post->id}/candidatura")->assertCreated();
        $this->come($worker, 'POST', "/api/posts/{$post->id}/candidatura")->assertOk(); // già inviata

        $this->come($worker, 'GET', '/api/feed')->assertJsonPath('0.candidato', true);
        $this->come($worker, 'GET', '/api/me/candidature')
            ->assertJsonCount(1, 'inviate')
            ->assertJsonPath('inviate.0.post.title', 'Cameriere')
            ->assertJsonPath('limite.usate', 1);

        // L'azienda riceve notifica e vede il candidato, anonimo finché non sblocca
        $this->assertSame(1, $azienda->notifications()->where('data->kind', 'candidatura')->count());
        $this->come($azienda, 'GET', '/api/me/candidature')
            ->assertJsonPath('ricevute.0.candidato.id', $worker->id)
            ->assertJsonPath('ricevute.0.candidato.last_name', null)
            ->assertJsonPath('ricevute.0.candidato.unlocked', false);

        $this->come($worker, 'DELETE', "/api/posts/{$post->id}/candidatura")->assertOk();
        $this->come($worker, 'GET', '/api/me/candidature')->assertJsonCount(0, 'inviate');
    }

    public function test_candidature_limitate_nel_free_e_vietate_alle_aziende(): void
    {
        $azienda = User::factory()->company()->create();
        $worker = $this->talento();
        for ($i = 0; $i < 10; $i++) {
            $this->come($worker, 'POST', '/api/posts/' . $this->annuncio($azienda)->id . '/candidatura')->assertCreated();
        }
        $altro = $this->annuncio($azienda);
        $this->come($worker, 'POST', "/api/posts/{$altro->id}/candidatura")->assertStatus(429);

        $this->come($worker, 'POST', '/api/abbonamento', ['piano' => 'premium'])->assertOk();
        $this->come($worker, 'POST', "/api/posts/{$altro->id}/candidatura")->assertCreated()->assertJsonPath('limite', null);

        $this->come(User::factory()->company()->create(), 'POST', "/api/posts/{$altro->id}/candidatura")->assertStatus(403);
    }

    public function test_talenti_con_stelle_ral_e_indicatore_di_mercato(): void
    {
        $azienda = User::factory()->company()->create(['settore' => 'Ristorazione / HoReCa']);
        $this->annuncio($azienda, 1200);
        $this->annuncio($azienda, 1300);
        $inLinea = $this->talento('WORKER', ['ral_aspettativa' => '€1.000 – €1.500/mese']);
        $sopra = $this->talento('WORKER', ['ral_aspettativa' => '€2.000 – €3.000/mese']);
        $freelance = $this->talento('PRO', ['ral_aspettativa' => 'Tariffa giornaliera / Freelance']);

        $talenti = collect($this->come($azienda, 'GET', '/api/talents')->assertOk()->json())->keyBy('id');
        $this->assertSame('in_linea', $talenti[$inLinea->id]['mercato']);
        $this->assertSame('sopra', $talenti[$sopra->id]['mercato']);
        $this->assertNull($talenti[$freelance->id]['mercato']);
        $this->assertEquals(1250, $talenti[$inLinea->id]['ral_mensile']);
        $this->assertSame('€1.000 – €1.500/mese', $talenti[$inLinea->id]['ral_aspettativa']);
        $this->assertSame(0, $talenti[$inLinea->id]['recensioni']);
    }

    public function test_recensioni_recenti_pesano_di_piu(): void
    {
        $worker = $this->talento();
        $vecchia = Review::create(['reviewer_id' => User::factory()->company()->create()->id, 'worker_id' => $worker->id, 'stars' => 1, 'comment' => 'Due anni fa, male.']);
        $vecchia->forceFill(['created_at' => now()->subMonths(30)])->save();
        Review::create(['reviewer_id' => User::factory()->company()->create()->id, 'worker_id' => $worker->id, 'stars' => 5, 'comment' => 'Quest\'anno, benissimo.']);

        // Media semplice 3,0; ponderata (1×0,3 + 5×1) / 1,3 = 4,1
        $this->assertSame(4.1, Review::aggiornaRating($worker->id));
        $this->come($worker, 'GET', "/api/profiles/{$worker->id}/reviews")->assertJsonPath('average', 4.1);
    }

    public function test_sblocchi_gratuiti_del_lancio_alpha(): void
    {
        config(['hirewave.sblocchi_gratuiti' => 1, 'services.stripe.secret' => 'sk_test_finto']);
        $azienda = User::factory()->company()->create();
        $pro = $this->talento('PRO');

        $this->come($azienda, 'GET', '/api/me')->assertJsonPath('user.sblocchi_gratuiti_rimasti', 1);
        $this->come($azienda, 'POST', '/api/stripe/checkout', ['worker_id' => $this->talento()->id])
            ->assertOk()->assertJsonPath('gratuito', true)->assertJsonPath('sblocchi_gratuiti_rimasti', 0);
        $this->assertSame(1, $azienda->fresh()->sblocchi_gratuiti_usati);

        // I professionisti non ne hanno
        $this->come($pro, 'GET', '/api/me')->assertJsonPath('user.sblocchi_gratuiti_rimasti', 0);
    }

    public function test_premium_annuale_dura_un_anno(): void
    {
        $worker = $this->talento();
        $this->come($worker, 'POST', '/api/abbonamento', ['piano' => 'premium_annuale'])
            ->assertOk()->assertJsonPath('abbonamento.piano', 'premium');

        $scade = $worker->fresh()->abbonamento_scade_at;
        $this->assertTrue($scade->between(now()->addDays(364), now()->addDays(366)));
    }

    public function test_onboarding_stagionale_senza_titolo_di_studio(): void
    {
        $worker = User::factory()->create(['role' => 'WORKER', 'onboarding_completato' => false]);

        $this->come($worker, 'POST', '/api/onboarding', [
            'percorso' => 'stagionale', 'settore' => 'Turismo / Hospitality', 'ral_aspettativa' => '€1.000 – €1.500/mese',
            'anni_esperienza' => 1,
        ])->assertStatus(422)->assertJsonValidationErrors(['disponibilita_da', 'zona']);

        $this->come($worker, 'POST', '/api/onboarding', [
            'percorso' => 'stagionale', 'settore' => 'Turismo / Hospitality', 'ral_aspettativa' => '€1.000 – €1.500/mese',
            'anni_esperienza' => 1, 'disponibilita_da' => '2027-06-01', 'disponibilita_a' => '2027-09-15', 'zona' => 'Costa pescarese',
        ])->assertOk();

        $worker->refresh();
        $this->assertSame('stagionale', $worker->percorso);
        $this->assertNull($worker->livello_istruzione);
        $this->assertSame('2027-09-15', $worker->disponibilita_a->toDateString());
        $this->assertTrue($worker->onboarding_completato == true);
    }
}
