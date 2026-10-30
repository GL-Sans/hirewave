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
        // Due percorsi, stesso prodotto (business plan, par. 2.3): stagionale rapido
        // (disponibilità e zona, titolo facoltativo) o certificato (5 domande)
        $stagionale = !$isCompany && $request->input('percorso') === 'stagionale';
        $livelli = 'in:licenza_media,diploma,laurea_triennale,laurea_magistrale';

        $request->validate([
            'percorso' => 'nullable|in:stagionale,certificato',
            'settore' => 'required|string|max:100',
            'ral_aspettativa' => 'required|string|max:100',
            // Lavoratori: titolo di studio. Aziende: dimensione aziendale
            'livello_istruzione' => match (true) {
                $isCompany => 'nullable|string',
                $stagionale => "nullable|$livelli",
                default => "required|$livelli",
            },
            'dimensione_azienda' => $isCompany ? 'required|in:micro,piccola,media,grande' : 'nullable',
            'anni_esperienza' => 'required|integer|min:0|max:50',
            'certificazioni' => 'nullable|string|max:500',
            'disponibilita_da' => $stagionale ? 'required|date' : 'nullable|date',
            'disponibilita_a' => 'nullable|date|after_or_equal:disponibilita_da',
            'zona' => $stagionale ? 'required|string|max:120' : 'nullable|string|max:120',
        ]);

        $data = [
            'settore' => $request->settore,
            'ral_aspettativa' => $request->ral_aspettativa,
            'anni_esperienza' => $request->anni_esperienza,
            'certificazioni' => $request->certificazioni,
            'badge' => 'grigio',
            'onboarding_completato' => true,
        ];

        if (!$isCompany) {
            $data['percorso'] = $stagionale ? 'stagionale' : 'certificato';
            $data['disponibilita_da'] = $request->disponibilita_da;
            $data['disponibilita_a'] = $request->disponibilita_a;
            $data['zona'] = $request->zona;
            if ($request->filled('disponibilita_da')) {
                $data['available'] = true;
            }
        }

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
