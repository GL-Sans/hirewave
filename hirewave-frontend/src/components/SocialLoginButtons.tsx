// Google e LinkedIn rimandano solo a indirizzi registrati nelle loro console:
// localhost o un dominio HTTPS (tunnel o sito). Un IP di rete locale
// (telefono in Wi-Fi su http://192.168.x.x) viene rifiutato con "accesso negato".
function isIndirizzoDiRete(hostname: string) {
    return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
}

export default function SocialLoginButtons() {
    const bloccato = isIndirizzoDiRete(window.location.hostname);

    const go = (provider: "google" | "linkedin") => {
        // Navigazione completa: il login social non può passare da axios
        window.location.href = `/api/auth/${provider}/redirect`;
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex-1 border-t border-slate-200" />
                oppure
                <span className="flex-1 border-t border-slate-200" />
            </div>

            {bloccato && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Google e LinkedIn non accettano l'indirizzo di rete locale ({window.location.host}).
                    Da telefono usa email e password, oppure apri l'app dal link HTTPS della demo.
                </p>
            )}

            <button
                type="button"
                onClick={() => go("google")}
                disabled={bloccato}
                className="w-full bg-white text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Continua con Google
            </button>

            <button
                type="button"
                onClick={() => go("linkedin")}
                disabled={bloccato}
                className="w-full bg-white text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Continua con LinkedIn
            </button>
        </div>
    );
}
