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
            ],
            'posts' => $user->posts,
        ]);
    }
}