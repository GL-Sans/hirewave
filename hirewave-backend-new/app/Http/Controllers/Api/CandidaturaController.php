<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\User;
use App\Notifications\HireWaveNotification;
use App\Support\Abbonamento;
use App\Support\ProfileAccess;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Candidature agli annunci delle aziende. Il talento resta anonimo: l'azienda
 * vede rating e badge e, se le interessa, sblocca il profilo.
 * Free: CANDIDATURE_FREE_AL_MESE ogni 30 giorni; Premium e Boost illimitate.
 */
class CandidaturaController extends Controller
{
    public function store(Post $post)
    {
        $user = Auth::user();
        $post->loadMissing('user');

        if ($user->role === 'COMPANY') {
            return response()->json(['message' => 'Le candidature sono per lavoratori e professionisti'], 403);
        }
        if ($post->type !== 'job' || $post->user?->role !== 'COMPANY') {
            return response()->json(['message' => 'Ci si candida solo agli annunci delle aziende'], 422);
        }

        if (self::giaCandidato($user->id, $post->id)) {
            return response()->json(['candidato' => true, 'limite' => self::limite($user)]);
        }

        $limite = self::limite($user);
        if ($limite && $limite['restanti'] <= 0) {
            return response()->json([
                'message' => 'Hai usato le ' . Abbonamento::CANDIDATURE_FREE_AL_MESE . ' candidature gratuite del mese. Con Premium sono illimitate.',
                'limite' => $limite,
            ], 429);
        }

        DB::table('candidature')->insert(['post_id' => $post->id, 'user_id' => $user->id, 'created_at' => now(), 'updated_at' => now()]);

        // Il nome del candidato resta nascosto finché l'azienda non sblocca
        $post->user->notify(new HireWaveNotification(
            'candidatura',
            "Nuova candidatura per «{$post->title}»",
            "{$user->first_name} · rating {$user->rating_tecnico}/100 · " . ($user->badge === 'verde' ? 'Certificato' : 'Dichiarato'),
            "/profile/{$user->id}",
        ));

        return response()->json(['candidato' => true, 'limite' => self::limite($user)], 201);
    }

    public function destroy(Post $post)
    {
        DB::table('candidature')->where('post_id', $post->id)->where('user_id', Auth::id())->delete();

        return response()->json(['candidato' => false, 'limite' => self::limite(Auth::user())]);
    }

    /** Talenti: candidature inviate. Aziende: candidature ricevute sui propri annunci. */
    public function index()
    {
        $user = Auth::user();

        if ($user->role === 'COMPANY') {
            return response()->json(['ricevute' => $this->ricevute($user)]);
        }

        $righe = DB::table('candidature')->where('user_id', $user->id)->orderByDesc('created_at')->get();
        $posts = Post::with('user')->whereIn('id', $righe->pluck('post_id'))->get()->keyBy('id');

        $inviate = $righe->filter(fn ($c) => isset($posts[$c->post_id]))->map(function ($c) use ($posts) {
            $p = $posts[$c->post_id];
            return [
                'id' => $c->id,
                'created_at' => $c->created_at,
                'post' => $p->only(['id', 'title', 'location', 'contract_type', 'budget', 'budget_type']),
                'azienda' => $p->user ? $p->user->only(['id', 'first_name', 'last_name', 'profile_image']) : null,
            ];
        })->values();

        return response()->json(['inviate' => $inviate, 'limite' => self::limite($user)]);
    }

    private function ricevute(User $azienda)
    {
        $righe = DB::table('candidature')
            ->join('posts', 'posts.id', '=', 'candidature.post_id')
            ->where('posts.user_id', $azienda->id)
            ->orderByDesc('candidature.created_at')
            ->get(['candidature.id', 'candidature.user_id', 'candidature.created_at', 'posts.id as post_id', 'posts.title']);

        $candidati = User::whereIn('id', $righe->pluck('user_id'))->get()->keyBy('id');
        $unlockedIds = ProfileAccess::unlockedIds($azienda);

        return $righe->filter(fn ($c) => isset($candidati[$c->user_id]))->map(function ($c) use ($candidati, $azienda, $unlockedIds) {
            $t = $candidati[$c->user_id];
            return [
                'id' => $c->id,
                'created_at' => $c->created_at,
                'post' => ['id' => $c->post_id, 'title' => $c->title],
                'candidato' => array_merge(ProfileAccess::present($azienda, $t, $unlockedIds), [
                    'rating_tecnico' => $t->rating_tecnico,
                    'rating_reputazionale' => $t->rating_reputazionale,
                    'unlocked' => in_array($t->id, $unlockedIds, true),
                    'unlock_price' => ProfileAccess::unlockPrice($t),
                ]),
            ];
        })->values();
    }

    public static function giaCandidato(int $userId, int $postId): bool
    {
        return DB::table('candidature')->where('user_id', $userId)->where('post_id', $postId)->exists();
    }

    /** Id degli annunci a cui $user si è candidato (per il feed) */
    public static function postIds(User $user): array
    {
        return DB::table('candidature')->where('user_id', $user->id)->pluck('post_id')->map(fn ($id) => (int) $id)->all();
    }

    /** Piano Free: candidature negli ultimi 30 giorni. Aziende e Premium: null */
    public static function limite(User $user): ?array
    {
        if ($user->role === 'COMPANY' || Abbonamento::isPremium($user)) {
            return null;
        }

        $usate = DB::table('candidature')
            ->where('user_id', $user->id)
            ->where('created_at', '>=', now()->subDays(30))
            ->count();

        return [
            'usate' => $usate,
            'massimo' => Abbonamento::CANDIDATURE_FREE_AL_MESE,
            'restanti' => max(0, Abbonamento::CANDIDATURE_FREE_AL_MESE - $usate),
        ];
    }
}
