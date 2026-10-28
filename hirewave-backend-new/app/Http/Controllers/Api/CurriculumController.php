<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentoVerifica;
use App\Support\RatingTecnico;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CurriculumController extends Controller
{
    public function update(Request $request)
    {
        $user = Auth::user();
        $isCompany = $user->role === 'COMPANY';

        $fields = $request->validate([
            'bio'              => 'nullable|string|max:1000',
            'city'             => 'nullable|string|max:100',
            'country'          => 'nullable|string|max:100',
            // Solo link web: niente javascript:, data: e simili
            'website'          => 'nullable|url:http,https|max:255',
            'phone'            => ['nullable', 'string', 'max:20', 'regex:/^[0-9+ ().\/-]+$/'],
            'birth_date'       => 'nullable|date|before:today|after:1900-01-01',
            'years_experience' => 'nullable|integer|min:0|max:60',
            'contract_type'    => 'nullable|string|max:100',
            'available'        => 'nullable|boolean',
            'curriculum_public' => 'nullable|boolean',
            'skills'           => 'nullable|array',
            'skills.*'         => 'string|max:50',
            'languages'        => 'nullable|array',
            'languages.*'      => 'string|max:50',
            // Dati del rating: solo per lavoratori e professionisti
            'livello_istruzione' => $isCompany ? 'prohibited' : 'sometimes|in:licenza_media,diploma,laurea_triennale,laurea_magistrale',
            'certificazioni'     => $isCompany ? 'prohibited' : 'sometimes|nullable|string|max:500',
        ]);

        // Un solo dato di esperienza: allinea quello dell'onboarding
        if (array_key_exists('years_experience', $fields) && $fields['years_experience'] !== null) {
            $fields['anni_esperienza'] = $fields['years_experience'];
        }

        // Un dato con un documento in verifica resta bloccato fino all'esito
        $bloccati = $this->campiBloccati($user, $fields);
        if ($bloccati) {
            return response()->json([
                'message' => 'Questi dati sono bloccati finché la verifica del documento non è conclusa: ' . implode(', ', $bloccati) . '.',
                'errors' => array_fill_keys(array_keys($bloccati), ['Dato in verifica: non modificabile.']),
            ], 422);
        }

        $prima = $user->only(['livello_istruzione', 'anni_esperienza', 'certificazioni']);
        $user->fill($fields)->save();

        if (!$isCompany) {
            $motivo = $this->motivo($prima, $user->only(['livello_istruzione', 'anni_esperienza', 'certificazioni']));
            if ($motivo) {
                RatingTecnico::aggiorna($user, $motivo);
            }
        }

        return response()->json(['user' => $user->fresh()]);
    }

    private function campiBloccati($user, array $fields): array
    {
        $aperti = DocumentoVerifica::where('user_id', $user->id)->aperti()->get();
        $out = [];

        if (isset($fields['livello_istruzione']) && $fields['livello_istruzione'] !== $user->livello_istruzione
            && $aperti->where('tipo', 'istruzione')->isNotEmpty()) {
            $out['livello_istruzione'] = 'istruzione';
        }
        if (isset($fields['anni_esperienza']) && (int) $fields['anni_esperienza'] !== (int) $user->anni_esperienza
            && $aperti->where('tipo', 'esperienza')->isNotEmpty()) {
            $out['years_experience'] = 'anni di esperienza';
        }
        if (array_key_exists('certificazioni', $fields)) {
            // Si possono aggiungere certificazioni, non togliere quelle in verifica
            $nuove = array_map([RatingTecnico::class, 'normalizza'], RatingTecnico::certificazioniDa($fields['certificazioni']));
            foreach ($aperti->where('tipo', 'certificazione') as $doc) {
                if (!in_array(RatingTecnico::normalizza($doc->riferimento), $nuove, true)) {
                    $out['certificazioni'] = "certificazione «{$doc->riferimento}»";
                }
            }
        }

        return $out;
    }

    /** Motivo leggibile della variazione, per lo storico del rating */
    private function motivo(array $prima, array $dopo): ?string
    {
        $parti = [];
        if ($prima['livello_istruzione'] !== $dopo['livello_istruzione']) {
            $parti[] = 'titolo di studio: ' . (RatingTecnico::ISTRUZIONE_LABEL[$dopo['livello_istruzione']] ?? 'non indicato');
        }
        if ((int) $prima['anni_esperienza'] !== (int) $dopo['anni_esperienza']) {
            $parti[] = "esperienza da {$prima['anni_esperienza']} a {$dopo['anni_esperienza']} anni";
        }
        $certPrima = RatingTecnico::certificazioniDa($prima['certificazioni']);
        $certDopo = RatingTecnico::certificazioniDa($dopo['certificazioni']);
        if (count($certPrima) !== count($certDopo) || array_diff($certPrima, $certDopo)) {
            $parti[] = 'certificazioni da ' . count($certPrima) . ' a ' . count($certDopo);
        }

        return $parti ? 'Curriculum aggiornato (' . implode('; ', $parti) . ')' : null;
    }
}
