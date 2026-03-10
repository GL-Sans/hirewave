<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function show()
    {
        return response()->json([
            'user' => Auth::user()
        ]);
    }

    public function uploadImage(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:10240', // 10MB max
        ]);

        $user = \App\Models\User::find(Auth::id());

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('profile', 'public');
            
            // Delete old image if needed (optional, but good practice)
            // if ($user->profile_image) {
            //     Storage::disk('public')->delete($user->profile_image);
            // }

            $user->profile_image = $path;
            $user->save();
        }

        return response()->json([
            'message' => 'Image uploaded successfully',
            'user' => $user
        ]);
    }
}
