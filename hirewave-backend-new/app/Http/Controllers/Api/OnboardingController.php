<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OnboardingController extends Controller
{
    public function submit(Request $request)
    {
        $request->validate([
            'settore' => 'required|string',
            'ral_aspettativa' => 'required|string',
            'livello_istruzione' => 'required|string',
            'anni_esperienza' => 'required|integer|min:0|max:50',
            'certificazioni' => 'nullable|string',
        ]);

        $user = Auth::user();
        $rating = $this->calcolaRating($request);

        $user->update([
            'settore' => $request->settore,
            'ral_aspettativa' => $request->ral_aspettativa,
            'livello_istruzione' => $request->livello_istruzione,
            'anni_esperienza' => $request->anni_esperienza,
            'certificazioni' => $request->certificazioni,
            'rating_tecnico' => $rating,
            'badge' => 'grigio',
            'onboarding_completato' => true,
        ]);

        return response()->json([
            'message' => 'Onboarding completato',
            'rating_tecnico' => $rating,
            'badge' => 'grigio',
            'user' => $user,
        ]);
    }

    private function calcolaRating(Request $request): int
    {
        $score = 0;

        // Istruzione (max 30 punti)
        $istruzione = [
            'licenza_media' => 5,
            'diploma' => 15,
            'laurea_triennale' => 22,
            'laurea_magistrale' => 30,
        ];
        $score += $istruzione[$request->livello_istruzione] ?? 10;

        // Esperienza (max 40 punti)
        $anni = (int) $request->anni_esperienza;
        if ($anni >= 10) $score += 40;
        elseif ($anni >= 5) $score += 30;
        elseif ($anni >= 3) $score += 20;
        elseif ($anni >= 1) $score += 10;
        else $score += 0;

        // Certificazioni (max 30 punti)
        if (!empty($request->certificazioni)) $score += 30;

        return min($score, 100);
    }
}