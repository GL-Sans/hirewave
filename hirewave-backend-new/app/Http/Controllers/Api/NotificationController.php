<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        return response()->json([
            'notifications' => $user->notifications()->latest()->limit(50)->get()
                ->map(fn ($n) => [
                    'id' => $n->id,
                    'kind' => $n->data['kind'] ?? null,
                    'title' => $n->data['title'] ?? '',
                    'body' => $n->data['body'] ?? '',
                    'url' => $n->data['url'] ?? null,
                    'read' => $n->read_at !== null,
                    'created_at' => $n->created_at,
                ]),
            'unread' => $user->unreadNotifications()->count(),
        ]);
    }

    // Solo il conteggio: usato dalla navbar ogni pochi secondi
    public function unreadCount()
    {
        return response()->json(['unread' => Auth::user()->unreadNotifications()->count()]);
    }

    public function read(string $id)
    {
        Auth::user()->notifications()->where('id', $id)->update(['read_at' => now()]);

        return response()->json(['read' => true]);
    }

    public function readAll()
    {
        Auth::user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['read' => true]);
    }
}
