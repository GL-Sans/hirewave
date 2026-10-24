export default function SocialLoginButtons() {
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

            <button
                type="button"
                onClick={() => go("google")}
                className="w-full bg-white text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50"
            >
                Continua con Google
            </button>

            <button
                type="button"
                onClick={() => go("linkedin")}
                className="w-full bg-white text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50"
            >
                Continua con LinkedIn
            </button>
        </div>
    );
}