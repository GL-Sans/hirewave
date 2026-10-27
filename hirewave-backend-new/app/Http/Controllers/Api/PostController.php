<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Post;
use Illuminate\Support\Facades\Auth;

class PostController extends Controller
{
    public function store(Request $request)
    {
        $user = Auth::user();

        // Regola chiara: company → job, altri → service
        $type = $user->role === 'COMPANY' ? 'job' : 'service';

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'contract_type' => 'nullable|string|in:Contratto a tempo indeterminato,Contratto a tempo determinato,Partita IVA,Apprendistato,Part-time,A chiamata',
            'budget' => 'nullable|integer|min:0',
            'budget_type' => 'nullable|string|in:Ora,Mensile,Fisso',
            'image' => 'nullable|image|max:10240', // 10MB max
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('posts', 'public');
        }

        $post = Post::create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'location' => $validated['location'] ?? null,
            'contract_type' => $validated['contract_type'] ?? null,
            'budget' => $validated['budget'] ?? null,
            'budget_type' => $validated['budget_type'] ?? 'Ora',
            'image' => $imagePath,
            'sponsored' => false,
        ]);

        return response()->json($post, 201);
    }
}
