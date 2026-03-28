<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;

class PublicProfileController extends Controller
{
    public function show($id)
    {
        $user = User::with(['posts.user' => function ($q) {
            $q->select('id', 'first_name', 'last_name', 'role', 'profile_image');
        }, 'posts' => function ($q) {
            $q->latest();
        }])->findOrFail($id);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'role' => $user->role,
                'profile_image' => $user->profile_image,
                'description' => $user->description,
            ],
            'posts' => $user->posts,
        ]);
    }
}
