<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\FrontendUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    private const PROVIDERS = [
        'google' => ['driver' => 'google', 'column' => 'google_id'],
        'linkedin' => ['driver' => 'linkedin-openid', 'column' => 'linkedin_id'],
    ];

    /**
     * Invia l'utente alla pagina di login del provider.
     */
    public function redirect(Request $request, string $provider)
    {
        $config = $this->providerConfig($provider);

        return $this->driver($request, $provider, $config)->redirect();
    }

    /**
     * Gestisce il ritorno dal provider.
     */
    public function callback(Request $request, string $provider)
    {
        $config = $this->providerConfig($provider);
        $frontend = FrontendUrl::resolve($request);

        try {
            $social = $this->driver($request, $provider, $config)->user();
        } catch (\Throwable $e) {
            report($e);
            return redirect($frontend . '/?error=social');
        }

        $providerId = (string) $social->getId();
        $email = $social->getEmail();
        $raw = is_array($social->user ?? null) ? $social->user : [];
        $emailVerified = filter_var($raw['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN);

        // Senza email verificata dal provider non si collega né si crea nulla
        if ($providerId === '' || !$email || !$emailVerified) {
            return redirect($frontend . '/?error=social_email');
        }

        // 1) Account social già collegato
        $user = User::where($config['column'], $providerId)->first();

        // 2) Stessa email già registrata: collego il provider all'account esistente
        if (!$user) {
            $user = User::where('email', $email)->first();

            if ($user) {
                $user->forceFill([
                    $config['column'] => $providerId,
                    'email_verified_at' => $user->email_verified_at ?? now(),
                ])->save();
            }
        }

        if ($user) {
            Auth::login($user);
            $request->session()->regenerate();

            return redirect($frontend . '/feed');
        }

        // 3) Utente nuovo: salvo i dati in sessione e chiedo la scelta del ruolo
        $firstName = $raw['given_name'] ?? null;
        $lastName = $raw['family_name'] ?? null;

        if (!$firstName) {
            $parts = explode(' ', trim((string) $social->getName()), 2);
            $firstName = $parts[0] !== '' ? $parts[0] : 'Utente';
            $lastName = $lastName ?: ($parts[1] ?? null);
        }

        $request->session()->put('social_pending', [
            'column' => $config['column'],
            'provider_id' => $providerId,
            'email' => $email,
            'first_name' => $firstName,
            'last_name' => $lastName ?: '-',
        ]);

        return redirect($frontend . '/auth/social/role');
    }

    /**
     * Completa la registrazione di un utente nuovo dopo la scelta del ruolo.
     */
    public function complete(Request $request)
    {
        $data = $request->validate([
            'role' => 'required|in:WORKER,PRO,COMPANY',
        ]);

        $pending = $request->session()->get('social_pending');

        if (!$pending) {
            return response()->json([
                'message' => 'Sessione scaduta, riprova ad accedere.',
            ], 422);
        }

        if (User::where('email', $pending['email'])->exists()) {
            $request->session()->forget('social_pending');

            return response()->json([
                'message' => 'Esiste già un account con questa email.',
            ], 409);
        }

        $user = User::create([
            'first_name' => $pending['first_name'],
            'last_name' => $pending['last_name'],
            'email' => $pending['email'],
            'password' => Str::random(40),
            'role' => $data['role'],
        ]);

        $user->forceFill([
            $pending['column'] => $pending['provider_id'],
            'email_verified_at' => now(),
            // Password casuale: dalle Impostazioni potrà impostarne una propria
            'has_password' => false,
        ])->save();

        Auth::login($user);
        $request->session()->forget('social_pending');
        $request->session()->regenerate();

        return response()->json(['user' => $user], 201);
    }

    private function providerConfig(string $provider): array
    {
        return self::PROVIDERS[$provider] ?? abort(404);
    }

    /**
     * Il callback torna sullo stesso indirizzo da cui è partito il login
     * (deve essere registrato anche nella console di Google / LinkedIn).
     */
    private function driver(Request $request, string $provider, array $config)
    {
        $callback = FrontendUrl::resolve($request) . "/api/auth/{$provider}/callback";

        return Socialite::driver($config['driver'])->redirectUrl($callback);
    }
}