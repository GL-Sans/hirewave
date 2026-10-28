<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentoVerifica;
use App\Models\User;
use App\Models\Post;
use App\Models\Review;
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
        $isCompanyViewer = $viewer->role === 'COMPANY';

        $unlocked = $isCompanyViewer && ProfileAccess::isUnlocked($viewer->id, $worker->id);

        $canSeeIdentity = ProfileAccess::canSeeIdentity($viewer, $worker);

        // Contatti: visibili se sbloccato, se il profilo è un'azienda o se il curriculum è pubblico
        $canSeeContacts = $canSeeIdentity || $worker->curriculum_public;

        $reviews = Review::where('worker_id', $worker->id)
            ->with('reviewer:id,first_name')
            ->latest()
            ->get();

        $average = round($reviews->avg('stars') ?? 0, 1);

        $author = ProfileAccess::present($viewer, $worker);

        // Documenti originali: solo al proprietario e a chi ha la Verifica Premium
        $verificati = DocumentoVerifica::where('user_id', $worker->id)->where('stato', 'verificato')->latest()->get();
        $premium = $isCompanyViewer && DocumentoController::haVerificaPremium($viewer->id, $worker->id);

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
                'livello_istruzione' => $worker->role === 'COMPANY' ? null : $worker->livello_istruzione,
                'ral_aspettativa' => $worker->role === 'COMPANY' ? null : $worker->ral_aspettativa,
                'rating_reputazionale' => $worker->rating_reputazionale ?? 0,

                'settore' => $worker->settore,
                // Dati aziendali pubblici
                'dimensione_azienda' => $worker->role === 'COMPANY' ? $worker->dimensione_azienda : null,
                'anni_attivita' => $worker->role === 'COMPANY' ? $worker->anni_esperienza : null,
                'cv' => $isOwnProfile ? $worker->cv : null,

                'unlocked' => $unlocked,
                'unlock_expires_at' => $unlocked
                    ? ProfileAccess::unlockExpiresAt($viewer->id, $worker->id)
                    : null,
                // stesse regole di MessageController::canMessage
                'can_contact' => !$isOwnProfile && (
                    !$isCompanyViewer ||
                    ($worker->role !== 'COMPANY' && $unlocked)
                ),
                'can_review' => ReviewController::canReview($viewer, $worker),

                'verifica_premium' => $premium,
                'verifica_premium_disponibile' => $unlocked && !$premium && $verificati->isNotEmpty(),
                'documenti' => $isOwnProfile || $premium
                    ? $verificati->map(fn ($d) => DocumentoController::presenta($d))->values()
                    : null,

                'rating_reputazionale_avg' => $average,
                'rating_reputazionale_count' => $reviews->count(),

                'curriculum_public' => $worker->curriculum_public,
                'email' => $canSeeContacts ? $worker->email : null,
                'phone' => $canSeeContacts ? $worker->phone : null,
                'city' => $canSeeContacts ? $worker->city : null,
                // questi solo se curriculum è pubblico
                'bio' => $worker->curriculum_public ? $worker->bio : null,
                'country' => $worker->curriculum_public ? $worker->country : null,
                'website' => $worker->curriculum_public ? $worker->website : null,
                'years_experience' => $worker->curriculum_public ? $worker->years_experience : null,
                'contract_type' => $worker->curriculum_public ? $worker->contract_type : null,
                'available' => $worker->curriculum_public ? $worker->available : null,
                'skills' => $worker->curriculum_public ? $worker->skills : null,
                'languages' => $worker->curriculum_public ? $worker->languages : null,
            ],

            'reviews' => $reviews,

            'posts' => $worker->posts->map(fn ($post) => array_merge($post->toArray(), ['user' => $author])),
        ]);
    }

    public function posts($id)
    {
        $viewer = Auth::user();
        $owner = User::findOrFail($id);
        $author = ProfileAccess::present($viewer, $owner);

        // Stesso anonimato del profilo: prima restituiva sempre cognome e foto
        return Post::where('user_id', $owner->id)
            ->latest()
            ->get()
            ->map(fn ($post) => array_merge($post->toArray(), ['user' => $author]));
    }
}
