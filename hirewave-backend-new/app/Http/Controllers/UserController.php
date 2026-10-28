<?php
namespace App\Http\Controllers;
use App\Http\Controllers\Api\ConnectionController;
use App\Models\User;
use App\Support\ProfileAccess;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    public function talents()
    {
        $viewer = Auth::user();
        $unlockedIds = ProfileAccess::unlockedIds($viewer);
        $savedIds = ConnectionController::savedIds($viewer);

        $talents = User::whereIn('role', ['WORKER', 'PRO'])
            ->where('id', '!=', $viewer->id)
            ->select('id', 'first_name', 'last_name', 'role', 'profile_image', 'badge', 'rating_tecnico', 'settore', 'skills', 'curriculum_public', 'livello_istruzione')
            // Le aziende cercano per rating: i migliori per primi, i verificati a parità
            ->orderByDesc('rating_tecnico')
            ->orderByRaw("badge = 'verde' desc")
            ->get()
            ->map(function ($user) use ($viewer, $unlockedIds, $savedIds) {
                // Foto e cognome solo se sbloccato (prima la foto veniva sempre inviata)
                $base = ProfileAccess::present($viewer, $user, $unlockedIds);
                return array_merge($base, [
                    'rating_tecnico' => $user->rating_tecnico,
                    'settore' => $user->settore,
                    // Il tipo di titolo è visibile prima dello sblocco (business plan)
                    'livello_istruzione' => $user->livello_istruzione,
                    // Stessa regola del profilo: skill visibili solo con curriculum pubblico
                    'skills' => $user->curriculum_public ? ($user->skills ?? []) : [],
                    'unlocked' => in_array($user->id, $unlockedIds, true),
                    'saved' => in_array($user->id, $savedIds, true),
                ]);
            });

        return response()->json($talents);
    }

    // Stessa forma dei talenti, così le due pagine usano la stessa card
    public function companies()
    {
        $viewer = Auth::user();
        $savedIds = ConnectionController::savedIds($viewer);
        $followedIds = ConnectionController::followedIds($viewer);

        return User::where('role', 'COMPANY')
            ->where('id', '!=', $viewer->id)
            ->select('id', 'first_name', 'last_name', 'role', 'profile_image', 'badge', 'settore', 'dimensione_azienda')
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'first_name' => $c->first_name,
                'last_name' => $c->last_name,
                'role' => $c->role,
                'profile_image' => $c->profile_image,
                'badge' => $c->badge,
                'settore' => $c->settore,
                'dimensione_azienda' => $c->dimensione_azienda,
                'skills' => [],
                'unlocked' => true,
                'saved' => in_array($c->id, $savedIds, true),
                'followed' => in_array($c->id, $followedIds, true),
            ]);
    }
}
