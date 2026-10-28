<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\Abbonamento;
use App\Support\RatingTecnico;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function show()
    {
        $user = Auth::user();
        $isTalent = $user->role !== 'COMPANY' && $user->onboarding_completato;

        return response()->json([
            'user' => array_merge($user->toArray(), ['piano' => Abbonamento::attivo($user)]),
            'abbonamento' => Abbonamento::stato($user),
            // Il perché del rating e le sue ultime variazioni, solo al proprietario
            'rating_dettaglio' => $isTalent ? RatingTecnico::dettaglio($user) : null,
            'rating_storico' => $isTalent
                ? DB::table('rating_storico')->where('user_id', $user->id)
                    ->orderByDesc('id')->limit(10)
                    ->get(['valore_precedente', 'valore', 'motivo', 'created_at'])
                : [],
        ]);
    }

    public function uploadImage(Request $request)
    {
        $request->validate([
            // Formati espliciti (niente SVG) e dimensioni massime in pixel
            'image' => 'required|image|mimes:jpg,jpeg,png,webp,gif|max:10240|dimensions:max_width=8000,max_height=8000',
        ]);

        $user = \App\Models\User::find(Auth::id());

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('profile', 'public');

            // La foto precedente non deve restare raggiungibile da chi ne conosce l'indirizzo
            if ($user->profile_image) {
                Storage::disk('public')->delete($user->profile_image);
            }

            $user->profile_image = $path;
            $user->save();
        }

        return response()->json([
            'message' => 'Image uploaded successfully',
            'user' => $user
        ]);
    }

    public function uploadCv(Request $request)
    {
        $request->validate([
            // "mimes" ricava il tipo dal contenuto reale del file, non dall'estensione
            'cv' => 'required|file|mimes:pdf,doc,docx|max:10240',
        ]);

        $user = Auth::user();

        if ($request->hasFile('cv')) {
            // Store on local disk (not public) to prevent direct URL access
            $path = $request->file('cv')->store('cvs', 'local');

            // Il CV sostituito è un dato personale da non conservare
            if ($user->cv) {
                Storage::disk('local')->delete($user->cv);
            }

            $user->cv = $path;
            $user->save();
        }

        return response()->json([
            'message' => 'CV uploaded successfully',
            'user' => $user
        ]);
    }

    public function downloadCv()
    {
        $user = Auth::user();
        
        if (!$user->cv || !Storage::disk('local')->exists($user->cv)) {
            return response()->json(['message' => 'CV non trovato'], 404);
        }

        return Storage::disk('local')->download($user->cv);
    }

    public function updateDescription(Request $request)
    {
        $request->validate([
            'description' => 'nullable|string|max:1000',
        ]);

        $user = Auth::user();
        $user->description = $request->description;
        $user->save();

        return response()->json([
            'message' => 'Description updated successfully',
            'user' => $user
        ]);
    }
}
