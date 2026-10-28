<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentoVerifica;
use App\Support\VerificaDocumenti;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/** Revisione manuale dei casi ambigui (business plan, par. 3.3) */
class AdminDocumentoController extends Controller
{
    public function index(Request $request)
    {
        $stato = $request->query('stato', 'revisione_manuale');
        abort_unless(in_array($stato, ['revisione_manuale', 'verificato', 'rifiutato', 'in_verifica'], true), 422);

        return response()->json(
            DocumentoVerifica::with('user:id,first_name,last_name,role,livello_istruzione,anni_esperienza,birth_date,certificazioni')
                ->where('stato', $stato)
                ->latest()
                ->limit(100)
                ->get()
                ->map(fn ($d) => array_merge(DocumentoController::presenta($d), [
                    'user' => $d->user,
                ]))
        );
    }

    public function esito(Request $request, DocumentoVerifica $documento)
    {
        $data = $request->validate([
            'approvato' => 'required|boolean',
            'nota' => 'nullable|string|max:500',
        ]);

        if ($documento->stato !== 'revisione_manuale') {
            return response()->json(['message' => 'Il documento non è in revisione manuale.'], 409);
        }

        VerificaDocumenti::revisiona($documento, Auth::user(), (bool) $data['approvato'], $data['nota'] ?? null);

        return response()->json(['documento' => DocumentoController::presenta($documento->fresh())]);
    }
}
