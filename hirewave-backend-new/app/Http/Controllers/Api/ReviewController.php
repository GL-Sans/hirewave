<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReviewController extends Controller
{
    // Recensioni libere verso chiunque, tranne se stessi
    public static function canReview(User $reviewer, User $target): bool
    {
        return $reviewer->id !== $target->id;
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
                'message' => 'Non puoi recensire il tuo profilo.',
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
