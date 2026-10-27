<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Support\ProfileAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FeedController extends Controller
{
    public function index(Request $request)
    {
        $viewer = Auth::user();
        $search = $request->query('q');

        $unlockedIds = ProfileAccess::unlockedIds($viewer);

        $posts = Post::with('user')
            ->where('user_id', '!=', $viewer->id)
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
                ['user' => ProfileAccess::present($viewer, $post->user, $unlockedIds)]
            ));

        return response()->json($posts);
    }
}
