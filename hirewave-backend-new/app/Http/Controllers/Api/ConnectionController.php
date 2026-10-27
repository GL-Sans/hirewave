<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\HireWaveNotification;
use App\Support\ProfileAccess;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Salva (segnalibro su talenti e aziende) e Segui (solo aziende:
 * si ricevono notifiche dei loro nuovi annunci).
 */
class ConnectionController extends Controller
{
    public function toggleSave(User $user)
    {
        $me = Auth::user();
        abort_if($me->id === $user->id, 422, 'Non puoi salvare il tuo profilo');

        $query = DB::table('saved_profiles')->where('user_id', $me->id)->where('saved_user_id', $user->id);

        if ($query->exists()) {
            $query->delete();
            return response()->json(['saved' => false]);
        }

        DB::table('saved_profiles')->insert([
            'user_id' => $me->id,
            'saved_user_id' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['saved' => true]);
    }

    public function toggleFollow(User $user)
    {
        $me = Auth::user();
        abort_unless($user->role === 'COMPANY', 422, 'Si possono seguire solo le aziende');
        abort_if($me->role === 'COMPANY', 422, 'Le aziende non seguono altre aziende');

        $query = DB::table('company_follows')->where('user_id', $me->id)->where('company_id', $user->id);

        if ($query->exists()) {
            $query->delete();
            return response()->json(['followed' => false]);
        }

        DB::table('company_follows')->insert([
            'user_id' => $me->id,
            'company_id' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // L'azienda vede il nuovo follower con lo stesso anonimato del resto della piattaforma
        $shown = ProfileAccess::present($user, $me);
        $user->notify(new HireWaveNotification(
            'follow',
            'Hai un nuovo follower',
            trim($shown['first_name'] . ' ' . ($shown['last_name'] ?? '')) . ' segue la tua azienda e riceverà i tuoi nuovi annunci.',
            '/profile/' . $me->id,
        ));

        return response()->json(['followed' => true]);
    }

    public static function savedIds(User $me): array
    {
        return DB::table('saved_profiles')->where('user_id', $me->id)->pluck('saved_user_id')->map(fn ($id) => (int) $id)->all();
    }

    public static function followedIds(User $me): array
    {
        return DB::table('company_follows')->where('user_id', $me->id)->pluck('company_id')->map(fn ($id) => (int) $id)->all();
    }
}
