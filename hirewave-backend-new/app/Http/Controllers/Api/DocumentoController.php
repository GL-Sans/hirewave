<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentoVerifica;
use App\Models\User;
use App\Support\RatingTecnico;
use App\Support\VerificaDocumenti;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Documenti di verifica del lavoratore: upload → dato bloccato → verifica
 * automatica → badge verde e rating ricalcolato (business plan, par. 3.3).
 */
class DocumentoController extends Controller
{
    public const MAX_DOCUMENTI = 20;

    public function index()
    {
        return response()->json(
            DocumentoVerifica::where('user_id', Auth::id())->latest()->get()
                ->map(fn ($d) => self::presenta($d))
        );
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if ($user->role === 'COMPANY' || !$user->onboarding_completato) {
            return response()->json(['message' => 'La verifica dei documenti è per lavoratori e professionisti che hanno completato l\'onboarding.'], 403);
        }

        $data = $request->validate([
            'tipo' => 'required|in:istruzione,esperienza,certificazione',
            'riferimento' => 'nullable|string|max:255',
            'anni' => 'required_if:tipo,esperienza|nullable|integer|min:1|max:60',
            'anno' => 'required_if:tipo,istruzione|nullable|integer|min:1940|max:' . (now()->year + 1),
            // "mimes" ricava il tipo dal contenuto reale del file, non dall'estensione
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
            // L'utente conferma che il dato resterà bloccato fino all'esito
            'conferma' => 'accepted',
        ]);

        if (DocumentoVerifica::where('user_id', $user->id)->count() >= self::MAX_DOCUMENTI) {
            return response()->json(['message' => 'Hai raggiunto il numero massimo di documenti: eliminane qualcuno.'], 422);
        }

        // Il titolo di studio verificato è sempre quello dichiarato nel profilo
        if ($data['tipo'] === 'istruzione') {
            $data['riferimento'] = $user->livello_istruzione;
        }

        if ($data['tipo'] === 'certificazione') {
            $nome = trim(preg_replace('/\s+/u', ' ', (string) ($data['riferimento'] ?? '')));
            if (mb_strlen($nome) < 2) {
                return response()->json(['errors' => ['riferimento' => ['Indica il nome della certificazione.']]], 422);
            }
            $data['riferimento'] = $nome;

            // Una certificazione nuova entra anche nel profilo, come dichiarata
            $dichiarate = RatingTecnico::certificazioniDa($user->certificazioni);
            if (!in_array(RatingTecnico::normalizza($nome), array_map([RatingTecnico::class, 'normalizza'], $dichiarate), true)) {
                $user->forceFill(['certificazioni' => implode(', ', [...$dichiarate, $nome])])->save();
            }
        }

        $gia = DocumentoVerifica::where('user_id', $user->id)->where('tipo', $data['tipo'])->aperti()
            ->when($data['tipo'] === 'certificazione', fn ($q) => $q->where('riferimento', $data['riferimento']))
            ->exists();
        if ($gia) {
            return response()->json(['message' => 'C\'è già un documento in verifica per questo dato.'], 409);
        }

        $file = $request->file('file');
        $doc = new DocumentoVerifica($data);
        $doc->forceFill([
            'user_id' => $user->id,
            // Disco privato: i documenti non hanno un indirizzo pubblico
            'file_path' => $file->store('documenti/' . $user->id, 'local'),
            'nome_file' => mb_substr($file->getClientOriginalName(), 0, 255),
            'mime' => $file->getMimeType(),
            'dimensione' => $file->getSize(),
            'hash' => hash_file('sha256', $file->getRealPath()),
            'stato' => 'in_verifica',
        ])->save();

        VerificaDocumenti::verifica($doc);

        return response()->json([
            'documento' => self::presenta($doc->fresh()),
            'user' => $user->fresh(),
            'rating_dettaglio' => RatingTecnico::dettaglio($user->fresh()),
        ], 201);
    }

    public function destroy(DocumentoVerifica $documento)
    {
        $user = Auth::user();
        if ($documento->user_id !== $user->id) {
            abort(404);
        }

        $eraVerificato = $documento->stato === 'verificato';
        $nome = VerificaDocumenti::descrizione($documento);
        Storage::disk('local')->delete($documento->file_path);
        $documento->delete();

        if ($eraVerificato) {
            RatingTecnico::aggiorna($user, "Documento eliminato: $nome");
        }

        return response()->json([
            'user' => $user->fresh(),
            'rating_dettaglio' => RatingTecnico::dettaglio($user->fresh()),
        ]);
    }

    /** Il file originale: al proprietario, agli amministratori e alle aziende con Verifica Premium */
    public function download(DocumentoVerifica $documento)
    {
        $viewer = Auth::user();
        if (!self::puoVedereFile($viewer, $documento)) {
            abort(404);
        }
        if (!Storage::disk('local')->exists($documento->file_path)) {
            abort(404);
        }

        return Storage::disk('local')->download($documento->file_path, $documento->nome_file);
    }

    public static function puoVedereFile(User $viewer, DocumentoVerifica $doc): bool
    {
        if ($viewer->id === $doc->user_id || $viewer->is_admin) {
            return true;
        }

        // La Verifica Premium si acquista solo con lo sblocco (aziende e professionisti)
        return $doc->stato === 'verificato'
            && self::haVerificaPremium($viewer->id, $doc->user_id);
    }

    public static function haVerificaPremium(int $companyId, int $workerId): bool
    {
        return DB::table('accessi_documenti')
            ->where('company_id', $companyId)
            ->where('worker_id', $workerId)
            ->exists();
    }

    public static function concediVerificaPremium(int $companyId, int $workerId): void
    {
        DB::table('accessi_documenti')->updateOrInsert(
            ['company_id' => $companyId, 'worker_id' => $workerId],
            ['acquistato_at' => now()]
        );
    }

    public static function presenta(DocumentoVerifica $d): array
    {
        return [
            'id' => $d->id,
            'tipo' => $d->tipo,
            'descrizione' => VerificaDocumenti::descrizione($d),
            'riferimento' => $d->riferimento,
            'anni' => $d->anni,
            'anno' => $d->anno,
            'nome_file' => $d->nome_file,
            'stato' => $d->stato,
            'esito' => $d->esito,
            'created_at' => $d->created_at,
            'verificato_at' => $d->verificato_at,
        ];
    }
}
