<?php

use App\Models\User;
use App\Support\RatingTecnico;
use App\Support\SecurityLog;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// php artisan security:report [--hours=24] [--ip=1.2.3.4]
Artisan::command('security:report {--hours=24} {--ip=}', function () {
    $since = now()->subHours((int) $this->option('hours'));
    $ip = $this->option('ip');

    $this->info('Eventi di sicurezza delle ultime ' . $this->option('hours') . ' ore' . ($ip ? " per $ip" : ''));
    $this->table(
        ['Tipo', 'Eventi', 'IP diversi'],
        DB::table('security_events')
            ->where('created_at', '>=', $since)
            ->when($ip, fn ($q) => $q->where('ip', $ip))
            ->selectRaw('type, COUNT(*) as n, COUNT(DISTINCT ip) as ips')
            ->groupBy('type')->orderByDesc('n')->get()
            ->map(fn ($r) => [$r->type, $r->n, $r->ips])->all()
    );

    $this->info('IP più attivi');
    $this->table(
        ['IP', 'Eventi', 'Tipi', 'Ultimo', 'Browser'],
        DB::table('security_events')
            ->where('created_at', '>=', $since)
            ->when($ip, fn ($q) => $q->where('ip', $ip))
            ->selectRaw('ip, COUNT(*) as n, GROUP_CONCAT(DISTINCT type) as types, MAX(created_at) as last, MAX(user_agent) as ua')
            ->groupBy('ip')->orderByDesc('n')->limit(15)->get()
            ->map(fn ($r) => [$r->ip, $r->n, $r->types, $r->last, mb_strimwidth((string) $r->ua, 0, 50, '…')])->all()
    );

    $this->info('Ultimi eventi');
    $this->table(
        ['Quando', 'Tipo', 'IP', 'Metodo', 'Percorso', 'Dettagli'],
        DB::table('security_events')
            ->where('created_at', '>=', $since)
            ->when($ip, fn ($q) => $q->where('ip', $ip))
            ->orderByDesc('id')->limit(20)->get()
            ->map(fn ($r) => [$r->created_at, $r->type, $r->ip, $r->method, mb_strimwidth((string) $r->path, 0, 40, '…'), mb_strimwidth((string) $r->details, 0, 60, '…')])->all()
    );

    $this->info('IP bloccati ora');
    $this->table(
        ['IP', 'Motivo', 'Volte', 'Fino a'],
        DB::table('blocked_ips')->where('blocked_until', '>', now())->orderByDesc('blocked_until')->get()
            ->map(fn ($r) => [$r->ip, $r->reason, $r->hits, $r->blocked_until])->all()
    );
})->purpose('Riepilogo di eventi di sicurezza, IP sospetti e IP bloccati');

Artisan::command('security:unblock {ip}', function (string $ip) {
    SecurityLog::unblock($ip)
        ? $this->info("IP $ip sbloccato.")
        : $this->warn("IP $ip non era bloccato.");
})->purpose('Sblocca un indirizzo IP');

Artisan::command('security:block {ip} {--minutes=1440} {--reason=manuale}', function (string $ip) {
    SecurityLog::block($ip, (string) $this->option('reason'), (int) $this->option('minutes'));
    $this->info("IP $ip bloccato per " . $this->option('minutes') . ' minuti.');
})->purpose('Blocca manualmente un indirizzo IP');

Artisan::command('security:prune', function () {
    SecurityLog::prune();
    $this->info('Eventi più vecchi di ' . SecurityLog::RETENTION_DAYS . ' giorni eliminati.');
})->purpose('Elimina gli eventi di sicurezza scaduti');

// php artisan rating:ricalcola — dopo un cambio della formula i valori salvati restano vecchi
Artisan::command('rating:ricalcola', function () {
    $righe = [];
    User::whereIn('role', ['WORKER', 'PRO'])->where('onboarding_completato', true)->each(function (User $u) use (&$righe) {
        $prima = (int) $u->rating_tecnico;
        $dopo = RatingTecnico::aggiorna($u, 'Ricalcolo con la formula v' . RatingTecnico::VERSIONE);
        $righe[] = [$u->id, "{$u->first_name} {$u->last_name}", $prima, $dopo, $u->badge];
    });
    $this->table(['Id', 'Utente', 'Prima', 'Dopo', 'Badge'], $righe);
})->purpose('Ricalcola il rating tecnico di tutti i lavoratori e professionisti');

// php artisan hirewave:admin email@esempio.it [--revoca]
Artisan::command('hirewave:admin {email} {--revoca}', function (string $email) {
    $user = User::where('email', $email)->first();
    if (!$user) {
        return $this->error("Nessun utente con email $email");
    }
    $user->forceFill(['is_admin' => !$this->option('revoca')])->save();
    $this->info($user->is_admin ? "$email ora è amministratore." : "$email non è più amministratore.");
})->purpose('Dà o toglie i permessi di revisione dei documenti');

// Con il cron di Laravel attivo (schedule:run) la pulizia è anche giornaliera
Schedule::command('security:prune')->daily();
