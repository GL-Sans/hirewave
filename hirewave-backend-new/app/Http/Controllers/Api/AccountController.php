<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\Post;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

/** Funzioni della pagina Impostazioni */
class AccountController extends Controller
{
    public function updatePreferences(Request $request)
    {
        $validated = $request->validate([
            'notifications_enabled' => 'required|boolean',
        ]);

        $user = Auth::user();
        $user->update($validated);

        return response()->json(['user' => $user]);
    }

    /**
     * Cambio password. Chi è entrato con Google/LinkedIn senza mai impostare
     * una password può crearne una senza indicare quella attuale.
     */
    public function updatePassword(Request $request)
    {
        $user = Auth::user();

        $request->validate([
            'current_password' => $user->has_password ? 'required|string' : 'nullable',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($user->has_password && !Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'La password attuale non è corretta.',
                'errors' => ['current_password' => ['La password attuale non è corretta.']],
            ], 422);
        }

        $user->forceFill([
            'password' => $request->password, // cast 'hashed' nel modello
            'has_password' => true,
        ])->save();

        return response()->json(['message' => 'Password aggiornata.']);
    }

    // "Scarica i miei dati": tutto ciò che la piattaforma conserva sull'utente
    public function export()
    {
        $user = Auth::user();

        $data = [
            'esportato_il' => now()->toIso8601String(),
            'profilo' => $user->makeHidden(['password', 'remember_token'])->toArray(),
            'post' => Post::where('user_id', $user->id)->get()->toArray(),
            'messaggi_inviati' => Message::where('sender_id', $user->id)->get(['receiver_id', 'body', 'created_at'])->toArray(),
            'messaggi_ricevuti' => Message::where('receiver_id', $user->id)->get(['sender_id', 'body', 'created_at'])->toArray(),
            'recensioni_scritte' => Review::where('reviewer_id', $user->id)->get(['worker_id', 'stars', 'comment', 'created_at'])->toArray(),
            'recensioni_ricevute' => Review::where('worker_id', $user->id)->get(['reviewer_id', 'stars', 'comment', 'created_at'])->toArray(),
            'profili_sbloccati' => DB::table('unlocked_profiles')->where('company_id', $user->id)->get(['worker_id', 'unlocked_at'])->toArray(),
            'sbloccato_da' => DB::table('unlocked_profiles')->where('worker_id', $user->id)->get(['company_id', 'unlocked_at'])->toArray(),
            'profili_salvati' => DB::table('saved_profiles')->where('user_id', $user->id)->pluck('saved_user_id')->toArray(),
            'aziende_seguite' => DB::table('company_follows')->where('user_id', $user->id)->pluck('company_id')->toArray(),
            'notifiche' => $user->notifications()->get(['data', 'read_at', 'created_at'])->toArray(),
        ];

        return response()->json($data, 200, [
            'Content-Disposition' => 'attachment; filename="hirewave-dati-' . $user->id . '.json"',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

    /**
     * Elimina account e dati collegati. Conferma con la password, oppure
     * scrivendo ELIMINA per chi non ha mai impostato una password.
     */
    public function destroy(Request $request)
    {
        $user = Auth::user();

        if ($user->has_password) {
            $request->validate(['password' => 'required|string']);
            if (!Hash::check($request->password, $user->password)) {
                return response()->json([
                    'message' => 'Password non corretta.',
                    'errors' => ['password' => ['Password non corretta.']],
                ], 422);
            }
        } else {
            $request->validate(['confirm' => 'required|in:ELIMINA']);
        }

        $files = array_filter([
            ['public', $user->profile_image],
            ['local', $user->cv],
            ...Post::where('user_id', $user->id)->whereNotNull('image')->pluck('image')->map(fn ($p) => ['public', $p])->all(),
        ], fn ($f) => !empty($f[1]));

        DB::transaction(function () use ($user) {
            // unlocked_profiles non ha cancellazione a cascata
            DB::table('unlocked_profiles')
                ->where('company_id', $user->id)
                ->orWhere('worker_id', $user->id)
                ->delete();
            $user->notifications()->delete();
            $user->delete(); // post, messaggi, recensioni, salvati e follow: a cascata
        });

        foreach ($files as [$disk, $path]) {
            Storage::disk($disk)->delete($path);
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['deleted' => true]);
    }
}
