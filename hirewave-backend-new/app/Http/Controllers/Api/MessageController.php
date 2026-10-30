<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Notifications\HireWaveNotification;
use App\Support\Chat;
use App\Support\ProfileAccess;

class MessageController extends Controller
{
    // Elenco conversazioni con ultimo messaggio e non letti
    public function conversations()
    {
        $me = Auth::user();

        $messages = Message::where('sender_id', $me->id)
            ->orWhere('receiver_id', $me->id)
            ->latest()
            ->get();

        $byContact = $messages->groupBy(fn ($m) => $m->sender_id === $me->id ? $m->receiver_id : $m->sender_id);

        $contacts = User::whereIn('id', $byContact->keys())->get()->keyBy('id');
        $unlockedIds = ProfileAccess::unlockedIds($me);

        $conversations = $byContact->map(function ($msgs, $contactId) use ($me, $contacts, $unlockedIds) {
            $last = $msgs->first();
            return [
                'contact' => $this->presentUser($me, $contacts[$contactId], $unlockedIds),
                'last_message' => $last->body,
                'last_message_at' => $last->created_at,
                'unread' => $msgs->where('receiver_id', $me->id)->whereNull('read_at')->count(),
            ];
        })->values();

        return response()->json($conversations);
    }

    // Messaggi con un utente (li segna come letti)
    public function index($userId)
    {
        $me = Auth::user();
        $other = User::findOrFail($userId);

        Message::where('sender_id', $other->id)
            ->where('receiver_id', $me->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        // Aprendo la conversazione si legge anche la relativa notifica
        $me->unreadNotifications()
            ->where('data->kind', 'message')
            ->where('data->sender_id', $other->id)
            ->update(['read_at' => now()]);

        $messages = Message::where(function ($q) use ($me, $other) {
            $q->where('sender_id', $me->id)->where('receiver_id', $other->id);
        })->orWhere(function ($q) use ($me, $other) {
            $q->where('sender_id', $other->id)->where('receiver_id', $me->id);
        })->oldest()->get(['id', 'sender_id', 'receiver_id', 'body', 'read_at', 'created_at']);

        $libera = Chat::libera($me, $other);

        return response()->json([
            'contact' => $this->presentUser($me, $other),
            'messages' => $messages,
            // Tra pari la conversazione resta leggibile ma non si scrive più
            'can_chat' => Chat::consentita($me, $other),
            // Testo libero solo con sblocco attivo; altrimenti messaggi preimpostati
            'can_send' => $libera,
            'preset' => $libera || $me->id === $other->id ? [] : Chat::presetPerFrontend($me, $other),
            'sblocco' => $this->offertaSblocco($me, $other),
        ]);
    }

    /**
     * Sblocco direttamente dalla chat: chi ti ha scritto si sblocca senza
     * passare dai Talenti. Mostra gli stessi dati visibili prima dello sblocco.
     */
    private function offertaSblocco(User $me, User $other): ?array
    {
        if (!ProfileAccess::canUnlock($me, $other) || ProfileAccess::isUnlocked($me->id, $other->id)) {
            return null;
        }

        return [
            'prezzo' => ProfileAccess::unlockPrice($other),
            'badge' => $other->badge,
            'rating_tecnico' => $other->rating_tecnico,
            'rating_reputazionale' => $other->rating_reputazionale,
            'settore' => $other->settore,
            'livello_istruzione' => $other->livello_istruzione,
            'ral_aspettativa' => $other->ral_aspettativa,
        ];
    }

    public function store(Request $request, $userId)
    {
        $me = Auth::user();
        $other = User::findOrFail($userId);

        $validated = $request->validate([
            'body' => 'required_without:preset|nullable|string|max:2000',
            'preset' => 'nullable|string|max:30',
        ]);

        if ($me->id === $other->id) {
            return response()->json(['message' => 'Non puoi scrivere a te stesso'], 422);
        }

        if (!Chat::consentita($me, $other)) {
            return response()->json(['message' => Chat::MSG_TRA_PARI], 403);
        }

        if (Chat::libera($me, $other) && !empty($validated['body'])) {
            $body = $validated['body'];
        } else {
            $preset = Chat::preset($me, $other);
            if (empty($validated['preset']) || !isset($preset[$validated['preset']])) {
                return response()->json([
                    'message' => ProfileAccess::canUnlock($me, $other)
                        ? 'Sblocca il profilo per scrivere liberamente: prima puoi inviare solo messaggi preimpostati'
                        : 'Prima dello sblocco puoi inviare solo messaggi preimpostati',
                ], 403);
            }
            $body = $preset[$validated['preset']];
        }

        $message = Message::create([
            'sender_id' => $me->id,
            'receiver_id' => $other->id,
            'body' => $body,
        ]);

        // Una sola notifica finché la precedente dello stesso mittente non è letta
        $alreadyNotified = $other->unreadNotifications()
            ->where('data->kind', 'message')
            ->where('data->sender_id', $me->id)
            ->exists();

        if (!$alreadyNotified) {
            // Il nome rispetta l'anonimato: quello che il destinatario può vedere di me
            $shown = ProfileAccess::present($other, $me);
            $other->notify(new HireWaveNotification(
                'message',
                'Nuovo messaggio da ' . trim($shown['first_name'] . ' ' . ($shown['last_name'] ?? '')),
                mb_strimwidth($message->body, 0, 120, '…'),
                "/chat?to={$me->id}",
                ['sender_id' => $me->id],
            ));
        }

        return response()->json($message, 201);
    }

    // Stesse regole di anonimato di feed e profili
    private function presentUser(User $me, User $other, ?array $unlockedIds = null): array
    {
        return ProfileAccess::present($me, $other, $unlockedIds);
    }
}
