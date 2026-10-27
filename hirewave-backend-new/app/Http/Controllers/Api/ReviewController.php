<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\Review;
use App\Models\User;
use App\Support\ProfileAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReviewController extends Controller
{
    /**
     * Si recensisce solo chi si è conosciuto sulla piattaforma:
     * una conversazione in chat o un profilo sbloccato. Mai se stessi.
     */
    public static function canReview(User $reviewer, User $target): bool
    {
        if ($reviewer->id === $target->id) {
            return false;
        }

        if ($reviewer->role === 'COMPANY' && ProfileAccess::isUnlocked($reviewer->id, $target->id)) {
            return true;
        }

        return Message::where(function ($q) use ($reviewer, $target) {
            $q->where('sender_id', $reviewer->id)->where('receiver_id', $target->id);
        })->orWhere(function ($q) use ($reviewer, $target) {
            $q->where('sender_id', $target->id)->where('receiver_id', $reviewer->id);
        })->exists();
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
                'message' => 'Puoi recensire solo utenti con cui hai avuto un contatto.',
            ], 403);
        }

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

        // Media stelle sul profilo recensito
        $avg = Review::where('worker_id', $target->id)->avg('stars');

        User::where('id', $target->id)->update([
            'rating_reputazionale' => round($avg, 1)
        ]);

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
            'average' => round($reviews->avg('stars') ?? 0, 1),
            'count' => $reviews->count(),
        ]);
    }
}
