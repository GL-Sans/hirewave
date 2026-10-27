<?php

namespace App\Http\Controllers;

use App\Support\SecurityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use App\Models\User;

class AuthController extends Controller
{
    // Tentativi di login falliti consentiti per account prima del blocco temporaneo
    private const MAX_ATTEMPTS = 5;
    private const LOCK_SECONDS = 15 * 60;

    // Campo nascosto nei moduli: le persone non lo vedono, i bot lo compilano
    public const HONEYPOT_FIELD = 'company_website';

    public function register(Request $request)
    {
        if ($this->honeypotFilled($request)) {
            return response()->json(['message' => 'Registrazione non riuscita.'], 422);
        }

        $request->merge(['email' => Str::lower(trim((string) $request->input('email')))]);

        $fields = $request->validate([
            // Lettere, spazi, apostrofi e trattini; niente caratteri di controllo o markup
            'first_name' => ['required', 'string', 'max:60', "regex:/^[\pL\pM' .-]+$/u"],
            'last_name' => ['required', 'string', 'max:60', "regex:/^[\pL\pM' .-]+$/u"],
            'email' => 'required|string|email:rfc|max:255|unique:users,email',
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
            'role' => 'required|in:WORKER,PRO,COMPANY'
        ], [
            'first_name.regex' => 'Il nome può contenere solo lettere, spazi, apostrofi e trattini.',
            'last_name.regex' => 'Il cognome può contenere solo lettere, spazi, apostrofi e trattini.',
        ]);

        $user = new User([
            'first_name' => trim($fields['first_name']),
            'last_name' => trim($fields['last_name']),
            'email' => $fields['email'],
            'password' => $fields['password'], // cast 'hashed' nel modello
        ]);
        // Il ruolo non è assegnabile in massa: si imposta esplicitamente
        $user->forceFill(['role' => $fields['role']])->save();

        // LOGIN AUTOMATICO DOPO REGISTRAZIONE
        Auth::login($user);

        // CREA LA SESSIONE
        $request->session()->regenerate();

        return response()->json([
            'user' => $user
        ], 201);
    }


    public function login(Request $request)
    {
        if ($this->honeypotFilled($request)) {
            return response()->json(['message' => 'Credenziali errate'], 401);
        }

        $request->merge(['email' => Str::lower(trim((string) $request->input('email')))]);

        $credentials = $request->validate([
            'email' => 'required|email|max:255',
            'password' => 'required|string|max:255',
        ]);

        // Blocco per account (oltre al limite per IP delle rotte): ferma chi prova
        // molte password sullo stesso utente cambiando indirizzo IP
        $accountKey = 'login:' . sha1($credentials['email']);

        if (RateLimiter::tooManyAttempts($accountKey, self::MAX_ATTEMPTS)) {
            SecurityLog::record('login_locked', ['email' => $credentials['email']]);
            $minutes = (int) ceil(RateLimiter::availableIn($accountKey) / 60);

            return response()->json([
                'message' => "Troppi tentativi. Riprova tra {$minutes} minuti.",
            ], 429);
        }

        if (!Auth::attempt($credentials)) {
            RateLimiter::hit($accountKey, self::LOCK_SECONDS);
            SecurityLog::record('login_failed', ['email' => $credentials['email']]);

            // Stesso messaggio per email inesistente e password sbagliata
            return response()->json(['message' => 'Credenziali errate'], 401);
        }

        RateLimiter::clear($accountKey);
        $request->session()->regenerate();

        return response()->json(['user' => Auth::user()]);
    }


    public function logout(Request $request)
    {
        auth()->guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out']);
    }

    private function honeypotFilled(Request $request): bool
    {
        if (!filled($request->input(self::HONEYPOT_FIELD))) {
            return false;
        }

        SecurityLog::record('honeypot_form', [
            'form' => $request->path(),
            'email' => mb_substr((string) $request->input('email'), 0, 255),
            'honeypot' => mb_substr((string) $request->input(self::HONEYPOT_FIELD), 0, 255),
        ]);

        return true;
    }
}
