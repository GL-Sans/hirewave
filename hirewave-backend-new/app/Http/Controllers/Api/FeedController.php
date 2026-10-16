<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class FeedController extends Controller
{
    public function index(Request $request)
    {
        $viewer = Auth::user();
        $search = $request->query('q');

        $unlockedIds = [];
        if ($viewer->role === 'COMPANY') {
            $unlockedIds = DB::table('unlocked_profiles')
                ->where('company_id', $viewer->id)
                ->pluck('worker_id')
                ->toArray();
        }

        $posts = Post::with('user:id,first_name,last_name,role,profile_image,badge')
            ->where('user_id', '!=', $viewer->id)
            ->when($search, fn($q) => $q->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%")
                ->orWhere('location', 'like', "%{$search}%")
                ->orWhere('contract_type', 'like', "%{$search}%");
            }))
            ->latest()
            ->get()
            ->map(function ($post) use ($viewer, $unlockedIds) {

                $isOwn = $post->user_id === $viewer->id;
                $isCompanyViewer = $viewer->role === 'COMPANY';
                $isWorkerViewer = $viewer->role !== 'COMPANY';

                $unlocked = $isOwn || in_array($post->user_id, $unlockedIds);

                $isAuthorCompany = $post->user->role === 'COMPANY';

                if ($isWorkerViewer) {

                    // WORKER VIEW → vede TUTTO delle aziende
                    if ($isAuthorCompany) {
                        // azienda visibile completamente
                        return $post;
                    }

                    // worker tra worker → anonimizzato
                    $post->user->last_name = null;
                    $post->user->profile_image = null;
                }

                if ($isCompanyViewer) {

                    // COMPANY VIEW

                    if ($unlocked) {
                        // sbloccato → full worker
                        return $post;
                    }

                    // non sbloccato → partial worker
                    $post->user->last_name = null;
                    $post->user->profile_image = null;
                }

                return $post;
            });

        return response()->json($posts);
    }
}