<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\DocumentoVerifica;
use App\Models\User;
use App\Support\FrontendUrl;
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
        ]);

        $company = Auth::user();
        if ($company->role !== 'COMPANY') {
            return response()->json(['message' => 'Solo le aziende possono sbloccare i profili'], 403);
        }

        $worker = User::findOrFail($request->worker_id);
        if ($worker->role === 'COMPANY') {
            return response()->json(['message' => 'Profilo non sbloccabile'], 422);
        }

        if (($request->prodotto ?? 'sblocco') === 'verifica_premium') {
            return $this->checkoutVerificaPremium($request, $company, $worker);
        }

        if (ProfileAccess::isUnlocked($company->id, $worker->id)) {
            return response()->json(['message' => 'Profilo già sbloccato'], 409);
        }

        $frontendUrl = FrontendUrl::resolve($request);

        if (!config('services.stripe.secret')) {
            // Modalità demo SOLO in locale: in produzione, una chiave mancante
            // avrebbe reso gli sblocchi gratuiti per tutti
            if (!app()->environment('local')) {
                report(new \RuntimeException('STRIPE_SECRET mancante: sblocchi disattivati'));
                return response()->json(['message' => 'Pagamenti momentaneamente non disponibili'], 503);
            }
            $this->unlock($company->id, $worker->id);
            return response()->json(['url' => $frontendUrl . '/talents?unlocked=' . $worker->id]);
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
                    'unit_amount' => $worker->badge === 'verde' ? 2999 : 1499,
                ],
                'quantity' => 1,
            ]],
            'mode' => 'payment',
            'success_url' => $frontendUrl . '/talents?unlocked=' . $worker->id . '&session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $frontendUrl . '/talents',
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
            return response()->json(['url' => $ritorno . '?verifica=ok']);
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
            'worker_id' => (int) $session->metadata->worker_id,
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
        $workerId = (int) $session->metadata->worker_id;

        if (($session->metadata->prodotto ?? 'sblocco') === 'verifica_premium') {
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
