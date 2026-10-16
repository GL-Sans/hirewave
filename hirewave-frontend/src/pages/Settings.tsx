import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "true");
    const [notifiche, setNotifiche] = useState(true);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("darkMode", "true");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("darkMode", "false");
        }
    }, [darkMode]);

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Impostazioni</h1>

            {/* Profilo */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Account</h2>
                <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-700 dark:text-slate-200">Nome</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{user?.first_name} {user?.last_name}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-700 dark:text-slate-200">Email</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-700 dark:text-slate-200">Ruolo</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{user?.role}</span>
                </div>
            </div>

            {/* Preferenze */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preferenze</h2>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Tema Scuro</p>
                        <p className="text-xs text-slate-500">Interfaccia con colori scuri</p>
                    </div>
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${darkMode ? "bg-blue-600" : "bg-slate-200"}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkMode ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Notifiche</p>
                        <p className="text-xs text-slate-500">Nuovi messaggi e opportunità</p>
                    </div>
                    <button
                        onClick={() => setNotifiche(!notifiche)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifiche ? "bg-blue-600" : "bg-slate-200"}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifiche ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                </div>
            </div>

            {/* Privacy */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Privacy e Sicurezza</h2>
                <button className="w-full text-left text-sm text-slate-700 dark:text-slate-200 py-2 hover:text-blue-600 transition-colors">
                    Cambia password →
                </button>
                <button className="w-full text-left text-sm text-slate-700 dark:text-slate-200 py-2 hover:text-blue-600 transition-colors">
                    Scarica i miei dati →
                </button>
                <button className="w-full text-left text-sm text-red-500 py-2 hover:text-red-700 transition-colors">
                    Elimina account →
                </button>
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