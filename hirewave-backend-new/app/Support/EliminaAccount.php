<?php
namespace App\Support;

use App\Models\DocumentoVerifica;
use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Cancellazione completa di un account: dati collegati e file (foto, CV,
 * immagini dei post, documenti di verifica). Usata dall'utente che elimina il
 * proprio account e dal comando di pulizia degli utenti di prova.
 */
class EliminaAccount
{
    public static function esegui(User $user): void
    {
        $files = array_filter([
            ['public', $user->profile_image],
            ['local', $user->cv],
            ...Post::where('user_id', $user->id)->whereNotNull('image')->pluck('image')->map(fn ($p) => ['public', $p])->all(),
            // I documenti di verifica sono dati personali: via anche i file
            ...DocumentoVerifica::where('user_id', $user->id)->pluck('file_path')->map(fn ($p) => ['local', $p])->all(),
        ], fn ($f) => !empty($f[1]));

        DB::transaction(function () use ($user) {
            // unlocked_profiles non ha cancellazione a cascata
            DB::table('unlocked_profiles')
                ->where('company_id', $user->id)
                ->orWhere('worker_id', $user->id)
                ->delete();
            $user->notifications()->delete();
            $user->delete(); // post, messaggi, recensioni, salvati e follow: a cascata
        });

        foreach ($files as [$disk, $path]) {
            Storage::disk($disk)->delete($path);
        }
    }
}
