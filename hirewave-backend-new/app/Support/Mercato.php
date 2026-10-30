<?php
namespace App\Support;

use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Retribuzioni di mercato dagli annunci attivi delle aziende, per l'indicatore
 * "In linea con mercato" accanto alla RAL (business plan, par. 5.1) e per
 * l'analisi della retribuzione del tutor.
 */
class Mercato
{
    /** Scarto oltre il quale la richiesta è sopra o sotto il mercato */
    public const TOLLERANZA = 10;

    /** Media mensile degli annunci con paga mensile, nel settore se ce ne sono abbastanza */
    public static function statistiche(?string $settore): ?array
    {
        $annunci = self::annunci();
        $nelSettore = $annunci->filter(fn ($p) => $p->user->settore === $settore);
        $usati = $nelSettore->count() >= 2 ? $nelSettore : $annunci;

        if ($usati->isEmpty()) {
            return null;
        }
        $importi = $usati->pluck('budget')->map(fn ($b) => (float) $b);

        return [
            'settore' => $usati === $nelSettore ? $settore : 'generale',
            'n' => $importi->count(),
            'media' => $importi->avg(),
            'min' => $importi->min(),
            'max' => $importi->max(),
        ];
    }

    /**
     * Confronto tra la retribuzione attesa e il mercato.
     * Null per tariffe giornaliere/freelance o senza annunci di riferimento.
     */
    public static function confronto(User $user): ?array
    {
        $attesa = self::importoMensile($user->ral_aspettativa);
        $mercato = $attesa ? self::statistiche($user->settore) : null;
        if (!$mercato) {
            return null;
        }

        $diff = (int) round(($attesa - $mercato['media']) / $mercato['media'] * 100);

        return [
            'esito' => match (true) {
                $diff > self::TOLLERANZA => 'sopra',
                $diff < -self::TOLLERANZA => 'sotto',
                default => 'in_linea',
            },
            'diff' => $diff,
            'media' => (int) round($mercato['media']),
            'settore' => $mercato['settore'],
        ];
    }

    /** "€1.000 – €1.500/mese" → 1250. Null per tariffe giornaliere o freelance */
    public static function importoMensile(?string $ral): ?float
    {
        if (!$ral || !str_contains($ral, 'mese')) {
            return null;
        }
        preg_match_all('/\d[\d.]*/', $ral, $m);
        $numeri = array_map(fn ($n) => (float) str_replace('.', '', $n), $m[0]);
        if (!$numeri) {
            return null;
        }
        // "Meno di €1.000" → 900
        return str_contains(Str::lower($ral), 'meno') ? $numeri[0] * 0.9 : array_sum($numeri) / count($numeri);
    }

    /** Una sola query per richiesta, anche con l'elenco di tutti i talenti */
    private static function annunci()
    {
        $attrs = request()->attributes;
        if (!$attrs->has('mercato.annunci')) {
            $attrs->set('mercato.annunci', Post::with('user:id,role,settore')
                ->where('type', 'job')->where('budget_type', 'Mensile')->whereNotNull('budget')->get()
                ->filter(fn ($p) => $p->user && $p->user->role === 'COMPANY')
                ->values());
        }

        return $attrs->get('mercato.annunci');
    }
}
