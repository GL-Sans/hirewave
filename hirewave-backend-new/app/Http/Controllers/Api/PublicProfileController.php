<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;

class PublicProfileController extends Controller
{
    public function show($name)
    {
        [$firstName, $lastName] = explode('-', $name, 2);

        $user = User::with(['posts.user' => function ($q) {
            $q->select('id', 'first_name', 'last_name', 'role', 'profile_image');
        }, 'posts' => function ($q) {
            $q->latest();
        }])->where('first_name', ucfirst($firstName))
        ->where('last_name', ucfirst($lastName))
        ->firstOrFail();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'role' => $user->role,
                'profile_image' => $user->profile_image,
                'curriculum_public' => $user->curriculum_public,
                // questi solo se curriculum è pubblico
                'bio' => $user->curriculum_public ? $user->bio : null,
                'city' => $user->curriculum_public ? $user->city : null,
                'country' => $user->curriculum_public ? $user->country : null,
                'website' => $user->curriculum_public ? $user->website : null,
                'years_experience' => $user->curriculum_public ? $user->years_experience : null,
                'contract_type' => $user->curriculum_public ? $user->contract_type : null,
                'available' => $user->curriculum_public ? $user->available : null,
                'skills' => $user->curriculum_public ? $user->skills : null,
                'languages' => $user->curriculum_public ? $user->languages : null,
            ],
            'posts' => $user->posts,
        ]);
    }
}
