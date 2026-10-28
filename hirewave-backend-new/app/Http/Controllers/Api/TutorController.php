<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\Abbonamento;
use App\Support\Tutor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TutorController extends Controller
{
    private const STORICO = 40;

    // Conversazione salvata + messaggio di benvenuto se è la prima volta
    public function index()
    {
        $user = Auth::user();

        $messaggi = DB::table('tutor_messaggi')
            ->where('user_id', $user->id)
            ->orderByDesc('id')->limit(self::STORICO)->get()
            ->reverse()->values()
            ->map(fn ($m) => [
                'id' => $m->id,
                'autore' => $m->autore,
                'testo' => $m->testo,
                'azioni' => $m->azioni ? json_decode($m->azioni, true) : [],
            ]);

        return response()->json([
            'messaggi' => $messaggi,
            'benvenuto' => Tutor::benvenuto($user),
            'limite' => $this->limite($user),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate(['testo' => 'required|string|max:500']);
        $user = Auth::user();

        $limite = $this->limite($user);
        if ($limite && $limite['restanti'] <= 0) {
            return response()->json([
                'message' => 'Hai usato le ' . Abbonamento::TUTOR_FREE_AL_GIORNO . ' domande gratuite di oggi. Con Premium il tutor è illimitato.',
                'limite' => $limite,
            ], 429);
        }

        $risposta = Tutor::rispondi($user, $data['testo']);

        $now = now();
        DB::table('tutor_messaggi')->insert([
            ['user_id' => $user->id, 'autore' => 'utente', 'testo' => $data['testo'], 'azioni' => null, 'created_at' => $now, 'updated_at' => $now],
            ['user_id' => $user->id, 'autore' => 'tutor', 'testo' => $risposta['testo'], 'azioni' => json_encode($risposta['azioni']), 'created_at' => $now, 'updated_at' => $now],
        ]);

        return response()->json(array_merge($risposta, ['limite' => $this->limite($user)]));
    }

    /** Piano Free dei talenti: domande al giorno. Aziende e Premium: illimitato (null) */
    private function limite($user): ?array
    {
        if ($user->role === 'COMPANY' || Abbonamento::isPremium($user)) {
            return null;
        }

        $usate = DB::table('tutor_messaggi')
            ->where('user_id', $user->id)->where('autore', 'utente')
            ->where('created_at', '>=', today())
            ->count();

        return [
            'usate' => $usate,
            'massimo' => Abbonamento::TUTOR_FREE_AL_GIORNO,
            'restanti' => max(0, Abbonamento::TUTOR_FREE_AL_GIORNO - $usate),
        ];
    }
}
