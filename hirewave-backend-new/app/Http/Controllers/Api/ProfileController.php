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

        $user = Auth::user();

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('profiles', 'public');
            
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

    public function uploadCv(Request $request)
    {
        $request->validate([
            'cv' => 'required|file|mimes:pdf,doc,docx|max:10240', // 10MB max
        ]);

        $user = Auth::user();

        if ($request->hasFile('cv')) {
            $path = $request->file('cv')->store('cvs', 'public');
            
            // if ($user->cv) {
            //     Storage::disk('public')->delete($user->cv);
            // }

            $user->cv = $path;
            $user->save();
        }

        return response()->json([
            'message' => 'CV uploaded successfully',
            'user' => $user
        ]);
    }

    public function updateDescription(Request $request)
    {
        $request->validate([
            'description' => 'nullable|string|max:1000',
        ]);

        $user = Auth::user();
        $user->description = $request->description;
        $user->save();

        return response()->json([
            'message' => 'Description updated successfully',
            'user' => $user
        ]);
    }
}
