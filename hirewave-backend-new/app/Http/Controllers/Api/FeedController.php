<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;

class FeedController extends Controller
{
    public function index()
    {
        $posts = Post::with('user:id,name,role')
            ->latest()
            ->get();

        return response()->json($posts);
    }
}
