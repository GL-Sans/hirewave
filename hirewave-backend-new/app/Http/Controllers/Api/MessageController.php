<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Notifications\HireWaveNotification;
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

        return response()->json([
            'contact' => $this->presentUser($me, $other),
            'messages' => $messages,
            'can_send' => $this->canMessage($me, $other),
        ]);
    }

    public function store(Request $request, $userId)
    {
        $me = Auth::user();
        $other = User::findOrFail($userId);

        $validated = $request->validate([
            'body' => 'required|string|max:2000',
        ]);

        if (!$this->canMessage($me, $other)) {
            return response()->json([
                'message' => $me->role === 'COMPANY'
                    ? 'Sblocca il profilo per scrivere a questo utente'
                    : 'Non puoi scrivere a questo utente',
            ], 403);
        }

        $message = Message::create([
            'sender_id' => $me->id,
            'receiver_id' => $other->id,
            'body' => $validated['body'],
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

    /**
     * Regole:
     * - lavoratori e professionisti possono scrivere a chiunque
     * - un'azienda può scrivere a un lavoratore solo se ha sbloccato il profilo
     * - tra aziende si può solo rispondere a chi ti ha scritto
     */
    private function canMessage(User $me, User $other): bool
    {
        if ($me->id === $other->id) {
            return false;
        }

        if ($me->role !== 'COMPANY') {
            return true;
        }

        if ($other->role !== 'COMPANY') {
            return $this->isUnlocked($me->id, $other->id);
        }

        return Message::where('sender_id', $other->id)->where('receiver_id', $me->id)->exists();
    }

    private function isUnlocked($companyId, $workerId): bool
    {
        return ProfileAccess::isUnlocked($companyId, $workerId);
    }

    // Stesse regole di anonimato di feed e profili
    private function presentUser(User $me, User $other, ?array $unlockedIds = null): array
    {
        return ProfileAccess::present($me, $other, $unlockedIds);
    }
}
