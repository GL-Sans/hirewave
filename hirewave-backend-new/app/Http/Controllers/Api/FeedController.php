<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Support\Abbonamento;
use App\Support\ProfileAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class FeedController extends Controller
{
    // Segnalazioni oltre le quali un post sparisce dal feed di tutti
    public const REPORTS_TO_HIDE = 3;

    public function index(Request $request)
    {
        $viewer = Auth::user();
        // Testo limitato e caratteri jolly di LIKE (% e _) trattati come testo normale
        $search = mb_substr(trim((string) $request->query('q', '')), 0, 100);
        $search = $search === '' ? null : addcslashes($search, '\\%_');

        $unlockedIds = ProfileAccess::unlockedIds($viewer);

        $posts = Post::with('user')
            ->where('user_id', '!=', $viewer->id)
            // "Non mi interessa" e post segnalati da me
            ->whereNotIn('id', DB::table('hidden_posts')->where('user_id', $viewer->id)->select('post_id'))
            ->whereNotIn('id', DB::table('post_reports')->where('user_id', $viewer->id)->select('post_id'))
            // Post con troppe segnalazioni
            ->whereNotIn('id', DB::table('post_reports')
                ->select('post_id')
                ->groupBy('post_id')
                ->havingRaw('COUNT(*) >= ?', [self::REPORTS_TO_HIDE]))
            ->when($search, fn($q) => $q->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%")
                ->orWhere('location', 'like', "%{$search}%")
                ->orWhere('contract_type', 'like', "%{$search}%");
            }))
            ->latest()
            ->get()
            // Aziende sempre visibili; lavoratori anonimi salvo sblocco dell'azienda
            ->map(fn ($post) => array_merge(
                $post->makeHidden('user')->toArray(),
                [
                    'user' => ProfileAccess::present($viewer, $post->user, $unlockedIds),
                    // Piano Boost: i post del lavoratore sono sponsorizzati
                    'sponsored' => (bool) $post->sponsored || Abbonamento::attivo($post->user) === 'boost',
                ]
            ))
            // Sponsorizzati in cima, il resto resta dal più recente
            ->sortByDesc('sponsored')
            ->values();

        return response()->json($posts);
    }
}
