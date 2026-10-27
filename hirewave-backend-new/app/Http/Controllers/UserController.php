<?php
namespace App\Http\Controllers;
use App\Models\User;
use App\Support\ProfileAccess;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    public function talents()
    {
        $viewer = Auth::user();
        $unlockedIds = ProfileAccess::unlockedIds($viewer);

        $talents = User::whereIn('role', ['WORKER', 'PRO'])
            ->where('id', '!=', $viewer->id)
            ->select('id', 'first_name', 'last_name', 'role', 'profile_image', 'badge', 'rating_tecnico', 'settore', 'skills', 'curriculum_public')
            ->get()
            ->map(function ($user) use ($viewer, $unlockedIds) {
                // Foto e cognome solo se sbloccato (prima la foto veniva sempre inviata)
                $base = ProfileAccess::present($viewer, $user, $unlockedIds);
                return array_merge($base, [
                    'rating_tecnico' => $user->rating_tecnico,
                    'settore' => $user->settore,
                    // Stessa regola del profilo: skill visibili solo con curriculum pubblico
                    'skills' => $user->curriculum_public ? ($user->skills ?? []) : [],
                    'unlocked' => in_array($user->id, $unlockedIds, true),
                ]);
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
