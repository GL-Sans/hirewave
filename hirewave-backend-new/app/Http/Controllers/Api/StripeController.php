<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\DocumentoVerifica;
use App\Models\User;
use App\Support\Abbonamento;
use App\Support\FrontendUrl;
use Illuminate\Support\Facades\DB;
use App\Support\ProfileAccess;
use App\Support\SecurityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Stripe\Stripe;
use Stripe\Checkout\Session;
use Stripe\Webhook;

class StripeController extends Controller
{
    public function createCheckout(Request $request)
    {
        $request->validate([
            'worker_id' => 'required|exists:users,id',
            'prodotto' => 'nullable|in:sblocco,verifica_premium',
            // Dove tornare dopo il pagamento: si sblocca senza lasciare la pagina
            'ritorno' => 'nullable|in:talents,profile,chat',
        ]);

        $company = Auth::user();
        $worker = User::findOrFail($request->worker_id);

        if (!ProfileAccess::canUnlock($company, $worker)) {
            return response()->json([
                'message' => $company->role === 'WORKER'
                    ? 'Lo sblocco dei profili è riservato ad aziende e professionisti'
                    : 'Profilo non sbloccabile',
            ], 403);
        }

        if (($request->prodotto ?? 'sblocco') === 'verifica_premium') {
            return $this->checkoutVerificaPremium($request, $company, $worker);
        }

        if (ProfileAccess::isUnlocked($company->id, $worker->id)) {
            return response()->json(['message' => 'Profilo già sbloccato'], 409);
        }

        $frontendUrl = FrontendUrl::resolve($request);
        $ritorno = match ($request->ritorno) {
            'chat' => $frontendUrl . '/chat?to=' . $worker->id,
            'profile' => $frontendUrl . '/profile/' . $worker->id,
            default => $frontendUrl . '/talents?unlocked=' . $worker->id,
        };

        // Lancio alpha: le prime aziende sbloccano gratis (config/hirewave.php)
        if (ProfileAccess::sblocchiGratuitiRimasti($company) > 0) {
            $company->increment('sblocchi_gratuiti_usati');
            $this->unlock($company->id, $worker->id);
            return response()->json([
                'url' => $ritorno,
                'demo' => true,
                'gratuito' => true,
                'sblocchi_gratuiti_rimasti' => ProfileAccess::sblocchiGratuitiRimasti($company),
            ]);
        }

        if (!config('services.stripe.secret')) {
            // Modalità demo SOLO in locale: in produzione, una chiave mancante
            // avrebbe reso gli sblocchi gratuiti per tutti
            if (!app()->environment('local')) {
                report(new \RuntimeException('STRIPE_SECRET mancante: sblocchi disattivati'));
                return response()->json(['message' => 'Pagamenti momentaneamente non disponibili'], 503);
            }
            $this->unlock($company->id, $worker->id);
            // "demo": il frontend aggiorna la pagina in place, senza ricaricarla
            return response()->json(['url' => $ritorno, 'demo' => true]);
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        $session = Session::create([
            'payment_method_types' => ['card'],
            'line_items' => [[
                'price_data' => [
                    'currency' => 'eur',
                    'product_data' => [
                        'name' => 'Sblocco profilo — ' . $worker->first_name . ' ' . $worker->last_name,
                        'description' => 'Accesso a nome, contatti e chat per 30 giorni',
                    ],
                    'unit_amount' => ProfileAccess::unlockPrice($worker),
                ],
                'quantity' => 1,
            ]],
            'mode' => 'payment',
            'success_url' => $ritorno . (str_contains($ritorno, '?') ? '&' : '?') . 'session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => strtok($ritorno, '?') . ($request->ritorno === 'chat' ? '?to=' . $worker->id : ''),
            'metadata' => [
                'worker_id' => $worker->id,
                'company_id' => $company->id,
            ],
        ]);

        return response()->json(['url' => $session->url]);
    }

    /** "Verifica Premium" €9,99: documenti originali di un profilo già sbloccato e verificato */
    private function checkoutVerificaPremium(Request $request, User $company, User $worker)
    {
        if (!ProfileAccess::isUnlocked($company->id, $worker->id)) {
            return response()->json(['message' => 'Sblocca prima il profilo'], 422);
        }
        if (!DocumentoVerifica::where('user_id', $worker->id)->where('stato', 'verificato')->exists()) {
            return response()->json(['message' => 'Questo profilo non ha documenti verificati'], 422);
        }
        if (DocumentoController::haVerificaPremium($company->id, $worker->id)) {
            return response()->json(['message' => 'Verifica Premium già acquistata'], 409);
        }

        $frontendUrl = FrontendUrl::resolve($request);
        $ritorno = $frontendUrl . '/profile/' . $worker->id;

        if (!config('services.stripe.secret')) {
            // Stessa modalità demo dello sblocco: solo in locale
            if (!app()->environment('local')) {
                report(new \RuntimeException('STRIPE_SECRET mancante: Verifica Premium disattivata'));
                return response()->json(['message' => 'Pagamenti momentaneamente non disponibili'], 503);
            }
            DocumentoController::concediVerificaPremium($company->id, $worker->id);
            return response()->json(['url' => $ritorno . '?verifica=ok', 'demo' => true]);
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        $session = Session::create([
            'payment_method_types' => ['card'],
            'line_items' => [[
                'price_data' => [
                    'currency' => 'eur',
                    'product_data' => [
                        'name' => 'Verifica Premium — ' . $worker->first_name . ' ' . $worker->last_name,
                        'description' => 'Accesso ai documenti originali di certificazione del profilo',
                    ],
                    'unit_amount' => 999,
                ],
                'quantity' => 1,
            ]],
            'mode' => 'payment',
            'success_url' => $ritorno . '?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $ritorno,
            'metadata' => [
                'worker_id' => $worker->id,
                'company_id' => $company->id,
                'prodotto' => 'verifica_premium',
            ],
        ]);

        return response()->json(['url' => $session->url]);
    }

    /** Premium €14,99/mese o €149,99/anno, Boost €29,99/mese (lavoratori e professionisti) */
    public function checkoutAbbonamento(Request $request)
    {
        $request->validate(['piano' => 'required|in:' . implode(',', array_keys(Abbonamento::PIANI))]);

        $user = Auth::user();
        if ($user->role === 'COMPANY') {
            return response()->json(['message' => 'Gli abbonamenti sono per lavoratori e professionisti'], 403);
        }

        $piano = $request->piano;
        $ritorno = FrontendUrl::resolve($request) . '/abbonamenti';

        if (!config('services.stripe.secret')) {
            if (!app()->environment('local')) {
                report(new \RuntimeException('STRIPE_SECRET mancante: abbonamenti disattivati'));
                return response()->json(['message' => 'Pagamenti momentaneamente non disponibili'], 503);
            }
            Abbonamento::attiva($user, $piano);
            return response()->json(['url' => $ritorno . '?attivato=' . $piano, 'demo' => true, 'abbonamento' => Abbonamento::stato($user)]);
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        // Un periodo alla volta: il rinnovo automatico richiede i prezzi ricorrenti su Stripe
        $session = Session::create([
            'payment_method_types' => ['card'],
            'line_items' => [[
                'price_data' => [
                    'currency' => 'eur',
                    'product_data' => [
                        'name' => 'HireWave ' . Abbonamento::PIANI[$piano]['nome'] . ' — ' . Abbonamento::PIANI[$piano]['giorni'] . ' giorni',
                    ],
                    'unit_amount' => Abbonamento::PIANI[$piano]['prezzo'],
                ],
                'quantity' => 1,
            ]],
            'mode' => 'payment',
            'success_url' => $ritorno . '?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $ritorno,
            'metadata' => [
                'company_id' => $user->id, // chi paga: confirm() lo confronta con l'utente
                'prodotto' => $piano,
            ],
        ]);

        return response()->json(['url' => $session->url]);
    }

    public function disdiciAbbonamento()
    {
        $user = Auth::user();
        Abbonamento::disattiva($user);

        return response()->json(['abbonamento' => Abbonamento::stato($user)]);
    }

    // Verifica il pagamento al ritorno dal checkout (non dipende dal webhook)
    public function confirm(Request $request)
    {
        $request->validate([
            'session_id' => 'required|string',
        ]);

        if (!config('services.stripe.secret')) {
            return response()->json(['unlocked' => false], 422);
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        try {
            $session = Session::retrieve($request->session_id);
        } catch (\Exception $e) {
            return response()->json(['unlocked' => false], 404);
        }

        if (
            $session->payment_status !== 'paid' ||
            (int) $session->metadata->company_id !== Auth::id() ||
            // Una sessione vecchia non può rinnovare gratis uno sblocco scaduto
            $session->created < now()->subDays(ProfileAccess::UNLOCK_DAYS)->timestamp
        ) {
            return response()->json(['unlocked' => false], 422);
        }

        $this->fulfill($session);

        return response()->json([
            'unlocked' => true,
            'prodotto' => $session->metadata->prodotto ?? 'sblocco',
            'worker_id' => (int) ($session->metadata->worker_id ?? 0),
        ]);
    }

    public function webhook(Request $request)
    {
        $payload = $request->getContent();
        $sig = $request->header('Stripe-Signature');
        $secret = config('services.stripe.webhook_secret');

        // Senza segreto la firma si verificherebbe con chiave vuota, che chiunque
        // può calcolare: un finto "pagamento completato" sbloccherebbe profili gratis
        if (empty($secret) || empty($sig)) {
            SecurityLog::record('stripe_webhook_rejected', ['reason' => empty($secret) ? 'segreto non configurato' : 'firma mancante']);
            return response()->json(['error' => 'Webhook non valido'], 400);
        }

        try {
            $event = Webhook::constructEvent($payload, $sig, $secret);
        } catch (\Exception $e) {
            SecurityLog::record('stripe_webhook_rejected', ['reason' => 'firma non valida']);
            // Nessun dettaglio dell'errore all'esterno
            return response()->json(['error' => 'Webhook non valido'], 400);
        }

        if ($event->type === 'checkout.session.completed') {
            $session = $event->data->object;
            if ($session->created < now()->subDays(ProfileAccess::UNLOCK_DAYS)->timestamp) {
                return response()->json(['status' => 'ignored']);
            }
            $this->fulfill($session);
        }

        return response()->json(['status' => 'ok']);
    }

    private function fulfill($session): void
    {
        $companyId = (int) $session->metadata->company_id;
        $prodotto = $session->metadata->prodotto ?? 'sblocco';

        if (isset(Abbonamento::PIANI[$prodotto])) {
            // Conferma e webhook possono arrivare entrambi: la stessa sessione vale una volta
            if (DB::table('pagamenti_elaborati')->insertOrIgnore(['session_id' => $session->id, 'created_at' => now()])) {
                $user = User::find($companyId);
                $user && Abbonamento::attiva($user, $prodotto);
            }
            return;
        }

        $workerId = (int) $session->metadata->worker_id;

        if ($prodotto === 'verifica_premium') {
            DocumentoController::concediVerificaPremium($companyId, $workerId);
        } else {
            $this->unlock($companyId, $workerId);
        }
    }

    private function unlock($companyId, $workerId): void
    {
        ProfileAccess::unlock((int) $companyId, (int) $workerId);
    }
}
