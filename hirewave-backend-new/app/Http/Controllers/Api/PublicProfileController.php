<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentoVerifica;
use App\Models\User;
use App\Models\Post;
use App\Models\Review;
use App\Support\Abbonamento;
use App\Support\Chat;
use App\Support\Mercato;
use App\Support\ProfileAccess;
use App\Support\RatingTecnico;
use Illuminate\Support\Facades\Auth;

class PublicProfileController extends Controller
{
    public function show($name)
    {
        $viewer = Auth::user();

        $query = User::with(['posts' => function ($q) {
            $q->latest();
        }]);

        // Solo per id ("9" oppure "9-giorgio-sansini"). La vecchia ricerca per
        // nome-cognome è stata tolta: permetteva di indovinare il cognome di un
        // lavoratore non sbloccato (se l'indirizzo rispondeva, il nome era giusto).
        if (!preg_match('/^(\d+)(-|$)/', (string) $name, $m)) {
            abort(404);
        }
        $worker = $query->where('id', (int) $m[1])->firstOrFail();

        $isOwnProfile = $viewer->id === $worker->id;
        // Aziende (su lavoratori e professionisti) e professionisti (su lavoratori)
        $canUnlock = ProfileAccess::canUnlock($viewer, $worker);

        $unlocked = $canUnlock && ProfileAccess::isUnlocked($viewer->id, $worker->id);

        // Accesso completo: proprietario, profili azienda, profili sbloccati a pagamento
        $fullAccess = ProfileAccess::canSeeIdentity($viewer, $worker);
        $isTalent = $worker->role !== 'COMPANY';

        // Contatti mai visibili senza sblocco, anche con curriculum pubblico (business plan, par. 5.1)
        $canSeeContacts = $fullAccess;
        // Curriculum: chi sblocca lo vede sempre; gli altri solo se il lavoratore lo rende pubblico
        $canSeeCurriculum = $fullAccess || $worker->curriculum_public;

        $reviews = Review::where('worker_id', $worker->id)
            ->with('reviewer:id,first_name')
            ->latest()
            ->get();

        $average = Review::mediaPonderata($reviews);

        $author = ProfileAccess::present($viewer, $worker);

        // Documenti originali: solo al proprietario e a chi ha la Verifica Premium
        $verificati = DocumentoVerifica::where('user_id', $worker->id)->where('stato', 'verificato')->latest()->get();
        $premium = $canUnlock && DocumentoController::haVerificaPremium($viewer->id, $worker->id);

        return response()->json([
            'user' => [
                'id' => $worker->id,
                'first_name' => $worker->first_name,
                'last_name' => $author['last_name'],
                'role' => $worker->role,
                'profile_image' => $author['profile_image'],

                'description' => $worker->description,
                'badge' => $worker->badge,

                // Il rating tecnico non esiste per le aziende
                'rating_tecnico' => $worker->role === 'COMPANY' ? null : ($worker->rating_tecnico ?? 0),
                // Il perché del rating, voce per voce. Nomi delle certificazioni
                // solo a chi ha già accesso ai dati completi
                'rating_dettaglio' => $worker->role === 'COMPANY' || !$worker->onboarding_completato
                    ? null
                    : RatingTecnico::pubblico(RatingTecnico::dettaglio($worker), $isOwnProfile || $unlocked),
                // Visibile prima dello sblocco (business plan, protocollo di visibilità)
                'livello_istruzione' => $isTalent ? $worker->livello_istruzione : null,
                'ral_aspettativa' => $isTalent ? $worker->ral_aspettativa : null,
                'mercato' => $isTalent ? Mercato::confronto($worker) : null,
                'rating_reputazionale' => $worker->rating_reputazionale ?? 0,
                'percorso' => $isTalent ? $worker->percorso : null,
                // Disponibilità (periodo e zona): sempre visibile
                'available' => $isTalent ? $worker->available : null,
                'disponibilita_da' => $isTalent ? $worker->disponibilita_da?->toDateString() : null,
                'disponibilita_a' => $isTalent ? $worker->disponibilita_a?->toDateString() : null,
                'zona' => $isTalent ? $worker->zona : null,
                // Istituto e anno del titolo: solo dopo lo sblocco
                'istituto' => $isTalent && $fullAccess ? $worker->istituto : null,
                'anno_titolo' => $isTalent && $fullAccess ? $worker->anno_titolo : null,

                'settore' => $worker->settore,
                // Dati aziendali pubblici
                'dimensione_azienda' => $worker->role === 'COMPANY' ? $worker->dimensione_azienda : null,
                'anni_attivita' => $worker->role === 'COMPANY' ? $worker->anni_esperienza : null,
                'cv' => $isOwnProfile ? $worker->cv : null,

                'unlocked' => $unlocked,
                // Pulsante "Sblocca" con il prezzo giusto (badge grigio o verde)
                'can_unlock' => $canUnlock && !$unlocked,
                'unlock_price' => ProfileAccess::unlockPrice($worker),
                'piano' => $worker->role === 'COMPANY' ? null : Abbonamento::attivo($worker),
                'unlock_expires_at' => $unlocked
                    ? ProfileAccess::unlockExpiresAt($viewer->id, $worker->id)
                    : null,
                // Chat tra chi può sbloccare e il talento: senza sblocco solo messaggi preimpostati (App\Support\Chat)
                'can_contact' => !$isOwnProfile && Chat::consentita($viewer, $worker),
                'chat_libera' => !$isOwnProfile && Chat::libera($viewer, $worker),
                'can_review' => ReviewController::canReview($viewer, $worker),

                'verifica_premium' => $premium,
                'verifica_premium_disponibile' => $unlocked && !$premium && $verificati->isNotEmpty(),
                'documenti' => $isOwnProfile || $premium
                    ? $verificati->map(fn ($d) => DocumentoController::presenta($d))->values()
                    : null,

                'rating_reputazionale_avg' => $average,
                'rating_reputazionale_count' => $reviews->count(),

                'curriculum_public' => $worker->curriculum_public,
                // Il frontend sa se il viewer vede tutto o se lo vedrebbe sbloccando
                'curriculum_completo' => $isTalent && $fullAccess,
                'curriculum_sbloccabile' => $canUnlock && !$unlocked,
                'has_cv' => $isTalent && !$isOwnProfile && $unlocked && (bool) $worker->cv,
                'email' => $canSeeContacts ? $worker->email : null,
                'phone' => $canSeeContacts ? $worker->phone : null,
                'city' => $canSeeContacts ? $worker->city : null,
                'bio' => $canSeeCurriculum ? $worker->bio : null,
                'country' => $canSeeCurriculum ? $worker->country : null,
                'website' => $canSeeCurriculum ? $worker->website : null,
                'years_experience' => $canSeeCurriculum ? $worker->years_experience : null,
                'contract_type' => $canSeeCurriculum ? $worker->contract_type : null,
                'skills' => $canSeeCurriculum ? $worker->skills : null,
                'languages' => $canSeeCurriculum ? $worker->languages : null,
            ],

            'reviews' => $reviews,

            'posts' => $this->conCandidatura($viewer, $worker->posts, $author),
        ]);
    }

    public function posts($id)
    {
        $viewer = Auth::user();
        $owner = User::findOrFail($id);
        $author = ProfileAccess::present($viewer, $owner);

        // Stesso anonimato del profilo: prima restituiva sempre cognome e foto
        return $this->conCandidatura($viewer, Post::where('user_id', $owner->id)->latest()->get(), $author);
    }

    /** Post con l'autore anonimizzato e lo stato della mia candidatura */
    private function conCandidatura(User $viewer, $posts, array $author)
    {
        $candidature = CandidaturaController::postIds($viewer);

        return $posts->map(fn ($post) => array_merge($post->toArray(), [
            'user' => $author,
            'candidato' => in_array($post->id, $candidature, true),
        ]))->values();
    }
}
