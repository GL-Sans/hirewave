<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    protected $fillable = ['reviewer_id', 'worker_id', 'stars', 'comment'];

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    /**
     * Peso di una recensione per età (business plan, par. 3.1: "media ponderata"):
     * l'ultimo anno vale di più, così il rating segue il lavoratore di oggi.
     */
    public static function peso(self $r): float
    {
        $mesi = $r->created_at ? $r->created_at->diffInMonths(now()) : 0;

        return match (true) {
            $mesi <= 12 => 1.0,
            $mesi <= 24 => 0.6,
            default => 0.3,
        };
    }

    /** Media ponderata delle stelle (una cifra decimale), 0 senza recensioni */
    public static function mediaPonderata($reviews): float
    {
        $pesoTotale = $reviews->sum(fn ($r) => self::peso($r));
        if ($pesoTotale <= 0) {
            return 0.0;
        }

        return round($reviews->sum(fn ($r) => $r->stars * self::peso($r)) / $pesoTotale, 1);
    }

    /** Ricalcola e salva il rating reputazionale del profilo recensito */
    public static function aggiornaRating(int $workerId): float
    {
        $media = self::mediaPonderata(self::where('worker_id', $workerId)->get());
        User::where('id', $workerId)->update(['rating_reputazionale' => $media]);

        return $media;
    }
}
