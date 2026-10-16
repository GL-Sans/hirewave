<?php
namespace App\Http\Controllers;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function talents()
    {
        $companyId = Auth::id();
        $unlockedIds = DB::table('unlocked_profiles')
            ->where('company_id', $companyId)
            ->pluck('worker_id')
            ->toArray();

        $talents = User::whereIn('role', ['WORKER', 'PRO'])
            ->where('id', '!=', $companyId)
            ->select('id', 'first_name', 'last_name', 'role', 'profile_image', 'badge', 'rating_tecnico', 'settore')
            ->get()
            ->map(function ($user) use ($unlockedIds) {
                $unlocked = in_array($user->id, $unlockedIds);
                return [
                    'id' => $user->id,
                    'first_name' => $user->first_name,
                    'last_name' => $unlocked ? $user->last_name : null,
                    'role' => $user->role,
                    'profile_image' => $user->profile_image,
                    'badge' => $user->badge,
                    'rating_tecnico' => $user->rating_tecnico,
                    'settore' => $user->settore,
                    'unlocked' => $unlocked,
                ];
            });

        return response()->json($talents);
    }

    public function companies()
    {
        return User::where('role', 'COMPANY')
            ->where('id', '!=', Auth::id())
            ->select('id', 'first_name', 'last_name', 'profile_image')
            ->get();
    }
}