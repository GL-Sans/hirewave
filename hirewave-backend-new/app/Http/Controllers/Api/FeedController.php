<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;

class FeedController extends Controller
{
    public function index()
    {
<<<<<<< HEAD
        $posts = Post::with('user:id,name,role')
=======
        $posts = Post::with('user:id,first_name,last_name,role,profile_image')
>>>>>>> dev_stefano
            ->latest()
            ->get();

        return response()->json($posts);
    }
}
