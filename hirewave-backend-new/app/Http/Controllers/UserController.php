<?php
namespace App\Http\Controllers;
use App\Http\Controllers\Api\ConnectionController;
use App\Models\User;
use App\Support\Abbonamento;
use App\Support\Mercato;
use App\Support\ProfileAccess;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function talents()
    {
        $viewer = Auth::user();
        $unlockedIds = ProfileAccess::unlockedIds($viewer);
        $savedIds = ConnectionController::savedIds($viewer);
        $recensioni = DB::table('reviews')->selectRaw('worker_id, COUNT(*) as n')->groupBy('worker_id')->pluck('n', 'worker_id');

        $talents = User::whereIn('role', ['WORKER', 'PRO'])
            ->where('id', '!=', $viewer->id)
            ->select('id', 'first_name', 'last_name', 'role', 'profile_image', 'badge', 'rating_tecnico', 'rating_reputazionale', 'settore', 'skills', 'curriculum_public', 'livello_istruzione', 'ral_aspettativa', 'available', 'disponibilita_da', 'disponibilita_a', 'zona', 'percorso', 'abbonamento', 'abbonamento_scade_at')
            ->get()
            // Boost in cima, poi Premium (business plan, par. 8.1); a parità di
            // piano i rating migliori per primi e i verificati davanti
            ->sort(fn ($a, $b) => [Abbonamento::priorita($b), $b->rating_tecnico, $b->badge === 'verde']
                <=> [Abbonamento::priorita($a), $a->rating_tecnico, $a->badge === 'verde'])
            ->values()
            ->map(function ($user) use ($viewer, $unlockedIds, $savedIds, $recensioni) {
                // Foto e cognome solo se sbloccato (prima la foto veniva sempre inviata)
                $base = ProfileAccess::present($viewer, $user, $unlockedIds);
                return array_merge($base, [
                    'rating_tecnico' => $user->rating_tecnico,
                    'rating_reputazionale' => $user->rating_reputazionale,
                    'recensioni' => (int) ($recensioni[$user->id] ?? 0),
                    'settore' => $user->settore,
                    // Visibili prima dello sblocco (business plan, par. 5.1)
                    'livello_istruzione' => $user->livello_istruzione,
                    'ral_aspettativa' => $user->ral_aspettativa,
                    'ral_mensile' => Mercato::importoMensile($user->ral_aspettativa),
                    'mercato' => Mercato::confronto($user)['esito'] ?? null,
                    'available' => $user->available,
                    'disponibilita_da' => $user->disponibilita_da?->toDateString(),
                    'disponibilita_a' => $user->disponibilita_a?->toDateString(),
                    'zona' => $user->zona,
                    'percorso' => $user->percorso,
                    // Stessa regola del profilo: skill visibili solo con curriculum pubblico
                    'skills' => $user->curriculum_public ? ($user->skills ?? []) : [],
                    'unlocked' => in_array($user->id, $unlockedIds, true),
                    'saved' => in_array($user->id, $savedIds, true),
                    'can_unlock' => ProfileAccess::canUnlock($viewer, $user),
                    'unlock_price' => ProfileAccess::unlockPrice($user),
                    'piano' => Abbonamento::attivo($user),
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
