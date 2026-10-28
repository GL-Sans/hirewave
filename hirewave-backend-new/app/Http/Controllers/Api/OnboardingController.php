<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Support\RatingTecnico;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OnboardingController extends Controller
{
    public function submit(Request $request)
    {
        $user = Auth::user();
        $isCompany = $user->role === 'COMPANY';

        $request->validate([
            'settore' => 'required|string|max:100',
            'ral_aspettativa' => 'required|string|max:100',
            // Lavoratori: titolo di studio. Aziende: dimensione aziendale
            'livello_istruzione' => $isCompany ? 'nullable|string' : 'required|in:licenza_media,diploma,laurea_triennale,laurea_magistrale',
            'dimensione_azienda' => $isCompany ? 'required|in:micro,piccola,media,grande' : 'nullable',
            'anni_esperienza' => 'required|integer|min:0|max:50',
            'certificazioni' => 'nullable|string|max:500',
        ]);

        $data = [
            'settore' => $request->settore,
            'ral_aspettativa' => $request->ral_aspettativa,
            'anni_esperienza' => $request->anni_esperienza,
            'certificazioni' => $request->certificazioni,
            'badge' => 'grigio',
            'onboarding_completato' => true,
        ];

        if ($isCompany) {
            // Il rating tecnico non si calcola per le aziende (la colonna vuole un valore: resta 0)
            $data['dimensione_azienda'] = $request->dimensione_azienda;
            $data['livello_istruzione'] = null;
            $data['rating_tecnico'] = 0;
        } else {
            $data['livello_istruzione'] = $request->livello_istruzione;
            // Stesso dato mostrato e modificabile nel curriculum
            $data['years_experience'] = $request->anni_esperienza;
        }

        // forceFill: rating, badge e stato dell'onboarding non sono assegnabili in massa
        $user->forceFill($data)->save();

        if (!$isCompany) {
            RatingTecnico::aggiorna($user, 'Rating iniziale generato dall\'onboarding');
        }

        return response()->json([
            'message' => 'Onboarding completato',
            'rating_tecnico' => $isCompany ? null : $user->rating_tecnico,
            'badge' => $user->badge,
            'user' => $user,
        ]);
    }
}
