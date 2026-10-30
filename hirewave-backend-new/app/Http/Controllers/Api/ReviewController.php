<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\User;
use App\Notifications\HireWaveNotification;
use App\Support\ProfileAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReviewController extends Controller
{
    // Rating reputazionale (business plan): recensisce solo chi ha pagato lo
    // sblocco del profilo, azienda o professionista. Anche a sblocco scaduto,
    // perché la recensione arriva dopo l'ingaggio.
    public static function canReview(User $reviewer, User $target): bool
    {
        return ProfileAccess::canUnlock($reviewer, $target)
            && ProfileAccess::everUnlocked($reviewer->id, $target->id);
    }

    public function store(Request $request, $workerId)
    {
        $request->validate([
            'stars' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|min:10|max:1000',
        ]);

        $target = User::findOrFail($workerId);

        if (!self::canReview(Auth::user(), $target)) {
            return response()->json([
                'message' => 'Puoi recensire solo i profili che hai sbloccato.',
            ], 403);
        }

        $isNew = !Review::where('reviewer_id', Auth::id())->where('worker_id', $target->id)->exists();

        $review = Review::updateOrCreate(
            [
                'reviewer_id' => Auth::id(),
                'worker_id' => $target->id
            ],
            [
                'stars' => $request->stars,
                'comment' => $request->comment
            ]
        );

        // Media ponderata delle stelle sul profilo recensito
        Review::aggiornaRating($target->id);

        if ($isNew) {
            $target->notify(new HireWaveNotification(
                'review',
                'Hai ricevuto una nuova recensione',
                Auth::user()->first_name . " ti ha dato {$request->stars} " . ($request->stars == 1 ? 'stella' : 'stelle') . '.',
                '/profile',
            ));
        }

        return response()->json($review->load('reviewer:id,first_name'), 201);
    }

    public function index($workerId)
    {
        $reviews = Review::where('worker_id', $workerId)
            ->with('reviewer:id,first_name')
            ->latest()
            ->get();

        return response()->json([
            'reviews' => $reviews,
            'average' => Review::mediaPonderata($reviews),
            'count' => $reviews->count(),
        ]);
    }
}
