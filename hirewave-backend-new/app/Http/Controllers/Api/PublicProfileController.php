<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\Post;
use App\Models\Review;

class PublicProfileController extends Controller
{
    public function show($name)
    {
        $viewer = Auth::user();

        $query = User::with(['posts' => function ($q) {
            $q->latest();
        }]);

        if (preg_match('/^(\d+)(-|$)/', (string) $name, $m)) {
            // Accesso per id, con o senza nome: "9" oppure "9-giorgio-sansini"
            $worker = $query->where('id', (int) $m[1])->firstOrFail();
        } else {
            // Accesso per slug first_name-last_name
            $parts = explode('-', $name, 2);

            if (count($parts) < 2) {
                abort(404);
            }

            [$firstName, $lastName] = $parts;

            $worker = $query
                ->where('first_name', ucfirst($firstName))
                ->where('last_name', ucfirst($lastName))
                ->firstOrFail();
        }

        $isOwnProfile = $viewer->id === $worker->id;
        $isCompanyViewer = $viewer->role === 'COMPANY';

        $unlocked = false;

        if ($isCompanyViewer) {
            $unlocked = DB::table('unlocked_profiles')
                ->where('company_id', $viewer->id)
                ->where('worker_id', $worker->id)
                ->exists();
        }

        $canSeeFullName =
            $isOwnProfile ||
            ($isCompanyViewer && $unlocked) ||
            $worker->role === 'COMPANY';

        $canSeeImage =
            $isOwnProfile ||
            ($isCompanyViewer && $unlocked) ||
            $worker->role === 'COMPANY';

        // Contatti: visibili se sbloccato o se il profilo è un'azienda
        $canSeeContacts = $canSeeFullName || $worker->curriculum_public;

        // REVIEWS + MEDIA
        $reviews = Review::where('worker_id', $worker->id)
            ->with('reviewer:id,first_name')
            ->latest()
            ->get();

        $average = round($reviews->avg('stars') ?? 0, 1);

        return response()->json([
            'user' => [
                'id' => $worker->id,
                'first_name' => $worker->first_name,
                'last_name' => $canSeeFullName ? $worker->last_name : null,
                'role' => $worker->role,
                'profile_image' => $canSeeImage ? $worker->profile_image : null,

                'description' => $worker->description,
                'badge' => $worker->badge,

                'rating_tecnico' => $worker->rating_tecnico ?? 0,
                'rating_reputazionale' => $worker->rating_reputazionale ?? 0,

                'settore' => $worker->settore,
                'cv' => $isOwnProfile ? $worker->cv : null,

                'unlocked' => $unlocked,
                // stesse regole di MessageController::canMessage
                'can_contact' => !$isOwnProfile && (
                    !$isCompanyViewer ||
                    ($worker->role !== 'COMPANY' && $unlocked)
                ),

                'rating_reputazionale_avg' => $average,
                'rating_reputazionale_count' => $reviews->count(),

                'curriculum_public' => $worker->curriculum_public,
                // questi solo se curriculum è pubblico
                'email' => $canSeeContacts ? $worker->email : null,
                'phone' => $canSeeContacts ? $worker->phone : null,
                'bio' => $worker->curriculum_public ? $worker->bio : null,
                'city' => $canSeeContacts ? $worker->city : null,
                'country' => $worker->curriculum_public ? $worker->country : null,
                'website' => $worker->curriculum_public ? $worker->website : null,
                'years_experience' => $worker->curriculum_public ? $worker->years_experience : null,
                'contract_type' => $worker->curriculum_public ? $worker->contract_type : null,
                'available' => $worker->curriculum_public ? $worker->available : null,
                'skills' => $worker->curriculum_public ? $worker->skills : null,
                'languages' => $worker->curriculum_public ? $worker->languages : null,
            ],

            'reviews' => $reviews,

            'posts' => $worker->posts->map(function ($post) use ($worker, $canSeeFullName, $canSeeImage) {
                return array_merge($post->toArray(), [
                    'user' => [
                        'id' => $worker->id,
                        'first_name' => $worker->first_name,
                        'last_name' => $canSeeFullName ? $worker->last_name : null,
                        'role' => $worker->role,
                        'profile_image' => $canSeeImage ? $worker->profile_image : null,
                    ]
                ]);
            }),
        ]);
    }

    public function posts($id)
    {
        return Post::with('user:id,first_name,last_name,role,profile_image,badge')
            ->where('user_id', $id)
            ->latest()
            ->get();
    }
}