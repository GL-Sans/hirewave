<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;

class PublicProfileController extends Controller
{
    public function show($id)
    {
        $user = User::with(['posts.user' => function ($q) {
            $q->select('id', 'name', 'role');
        }, 'posts' => function ($q) {
            $q->latest();
        }])->findOrFail($id);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->role,
            ],
            'posts' => $user->posts,
        ]);
    }
}
