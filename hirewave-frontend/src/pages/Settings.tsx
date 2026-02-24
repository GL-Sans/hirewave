import { useState } from "react";

export default function SettingsPage() {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [darkModeEnabled, setDarkModeEnabled] = useState(false);

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-6 bg-white rounded-2xl shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">
                Impostazioni
            </h1>

            <div className="space-y-6">
                {/* Mock Setting 1 */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-800">
                            Notifiche
                        </h2>
                        <p className="text-xs text-slate-500">
                            Ricevi notifiche push per nuovi messaggi e
                            opportunità
                        </p>
                    </div>
                    <button
                        onClick={() =>
                            setNotificationsEnabled(!notificationsEnabled)
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notificationsEnabled ? "bg-blue-600" : "bg-slate-200"}`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationsEnabled ? "translate-x-3" : "-translate-x-3"}`}
                        />
                    </button>
                </div>

                <hr className="border-slate-100" />

                {/* Mock Setting 2 */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-800">
                            Tema Scuro
                        </h2>
                        <p className="text-xs text-slate-500">
                            Attiva l'interfaccia con colori scuri\
                        </p>
                    </div>
                    <button
                        onClick={() => setDarkModeEnabled(!darkModeEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${darkModeEnabled ? "bg-blue-600" : "bg-slate-200"}`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkModeEnabled ? "translate-x-3" : "-translate-x-3"}`}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
}
