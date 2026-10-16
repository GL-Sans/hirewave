<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\User;
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
        ]);

        $worker = User::findOrFail($request->worker_id);
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
            'success_url' => env('FRONTEND_URL') . '/talents?unlocked=' . $worker->id,
            'cancel_url' => env('FRONTEND_URL') . '/talents',
            'metadata' => [
                'worker_id' => $worker->id,
                'company_id' => Auth::id(),
            ],
        ]);

        return response()->json(['url' => $session->url]);
    }

    public function webhook(Request $request)
    {
        $payload = $request->getContent();
        $sig = $request->header('Stripe-Signature');

        try {
            $event = Webhook::constructEvent(
                $payload,
                $sig,
                config('services.stripe.webhook_secret')
            );
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }

        if ($event->type === 'checkout.session.completed') {
            $session = $event->data->object;
            $workerId = $session->metadata->worker_id;
            $companyId = $session->metadata->company_id;

            // Salva lo sblocco nel DB
            \DB::table('unlocked_profiles')->insertOrIgnore([
                'company_id' => $companyId,
                'worker_id' => $workerId,
                'unlocked_at' => now(),
            ]);
        }

        return response()->json(['status' => 'ok']);
    }
}