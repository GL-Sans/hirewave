<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReviewController extends Controller
{
    public function store(Request $request, $workerId)
    {
        $request->validate([
            'stars' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|min:10',
        ]);

        $review = Review::updateOrCreate(
            [
                'reviewer_id' => Auth::id(),
                'worker_id' => $workerId
            ],
            [
                'stars' => $request->stars,
                'comment' => $request->comment
            ]
        );

        // 🔥 CALCOLO MEDIA STELLE
        $avg = Review::where('worker_id', $workerId)->avg('stars');

        // 🔥 UPDATE USER
        User::where('id', $workerId)->update([
            'rating_reputazionale' => round($avg, 1)
        ]);

        return response()->json($review, 201);
    }

    public function index($workerId)
    {
        $reviews = Review::where('worker_id', $workerId)
            ->with('reviewer:id,first_name')
            ->latest()
            ->get();

        return response()->json([
            'reviews' => $reviews,
            'average' => round($reviews->avg('stars'), 1),
            'count' => $reviews->count(),
        ]);
    }
}