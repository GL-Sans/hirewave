<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\User;
use App\Notifications\HireWaveNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

class PostController extends Controller
{
    public const REPORT_REASONS = ['spam', 'truffa', 'inappropriato', 'falso', 'altro'];

    private function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'location' => 'nullable|string|max:255',
            'contract_type' => 'nullable|string|in:Contratto a tempo indeterminato,Contratto a tempo determinato,Partita IVA,Apprendistato,Part-time,A chiamata',
            'budget' => 'nullable|integer|min:0|max:10000000',
            'budget_type' => 'nullable|string|in:Ora,Mensile,Fisso',
            // Formati espliciti (niente SVG) e dimensioni massime in pixel
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp,gif|max:10240|dimensions:max_width=8000,max_height=8000',
        ];
    }

    public function store(Request $request)
    {
        $user = Auth::user();

        // Regola chiara: company → job, altri → service
        $type = $user->role === 'COMPANY' ? 'job' : 'service';

        $validated = $request->validate($this->rules());

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

        // Chi segue l'azienda riceve una notifica del nuovo annuncio
        if ($type === 'job') {
            $followerIds = DB::table('company_follows')->where('company_id', $user->id)->pluck('user_id');
            Notification::send(
                User::whereIn('id', $followerIds)->get(),
                new HireWaveNotification(
                    'job_post',
                    "Nuovo annuncio da {$user->first_name} {$user->last_name}",
                    $post->title,
                    "/feed?post={$post->id}",
                )
            );
        }

        return response()->json($post, 201);
    }

    public function update(Request $request, Post $post)
    {
        abort_unless($post->user_id === Auth::id(), 403, 'Puoi modificare solo i tuoi post');

        $validated = $request->validate($this->rules() + [
            'remove_image' => 'nullable|boolean',
        ]);

        if ($request->hasFile('image') || $request->boolean('remove_image')) {
            if ($post->image) {
                Storage::disk('public')->delete($post->image);
            }
            $post->image = $request->hasFile('image')
                ? $request->file('image')->store('posts', 'public')
                : null;
        }

        $post->fill([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'location' => $validated['location'] ?? null,
            'contract_type' => $validated['contract_type'] ?? null,
            'budget' => $validated['budget'] ?? null,
            'budget_type' => $validated['budget_type'] ?? $post->budget_type,
        ])->save();

        return response()->json($post);
    }

    public function destroy(Post $post)
    {
        abort_unless($post->user_id === Auth::id(), 403, 'Puoi eliminare solo i tuoi post');

        if ($post->image) {
            Storage::disk('public')->delete($post->image);
        }
        $post->delete();

        return response()->json(['deleted' => true]);
    }

    // "Non mi interessa": il post sparisce dal feed di chi lo nasconde
    public function hide(Post $post)
    {
        DB::table('hidden_posts')->insertOrIgnore([
            'user_id' => Auth::id(),
            'post_id' => $post->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['hidden' => true]);
    }

    public function unhide(Post $post)
    {
        DB::table('hidden_posts')->where('user_id', Auth::id())->where('post_id', $post->id)->delete();

        return response()->json(['hidden' => false]);
    }

    /**
     * Segnalazione: il post viene nascosto a chi segnala e, raggiunte
     * FeedController::REPORTS_TO_HIDE segnalazioni, a tutti.
     */
    public function report(Request $request, Post $post)
    {
        abort_if($post->user_id === Auth::id(), 422, 'Non puoi segnalare un tuo post');

        $validated = $request->validate([
            'reason' => 'required|in:' . implode(',', self::REPORT_REASONS),
            'details' => 'nullable|string|max:1000',
        ]);

        DB::table('post_reports')->updateOrInsert(
            ['user_id' => Auth::id(), 'post_id' => $post->id],
            [
                'reason' => $validated['reason'],
                'details' => $validated['details'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        return response()->json(['reported' => true]);
    }
}
