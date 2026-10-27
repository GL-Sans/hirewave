import { useAuth } from "../context/AuthContext";
import { roleLabel } from "../utils/labels";

// Tema scuro, notifiche, cambio password, export dati ed eliminazione account
// erano pulsanti senza funzione: verranno aggiunti quando implementati.
export default function SettingsPage() {
    const { user, logout } = useAuth();

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold text-slate-900">Impostazioni</h1>

            {/* Profilo */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-1">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Account</h2>
                <div className="flex justify-between items-center gap-4 py-2">
                    <span className="text-sm text-slate-700">Nome</span>
                    <span className="text-sm font-medium text-slate-900 text-right">{user?.first_name} {user?.last_name}</span>
                </div>
                <div className="flex justify-between items-center gap-4 py-2">
                    <span className="text-sm text-slate-700">Email</span>
                    <span className="text-sm font-medium text-slate-900 text-right break-all">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center gap-4 py-2">
                    <span className="text-sm text-slate-700">Ruolo</span>
                    <span className="text-sm font-medium text-slate-900">{roleLabel(user?.role)}</span>
                </div>
            </div>

            {/* Logout */}
            <button
                onClick={logout}
                className="w-full bg-red-50 text-red-600 font-semibold py-3 rounded-2xl hover:bg-red-100 transition-colors"
            >
                Esci dall'account
            </button>
        </div>
    );
}
