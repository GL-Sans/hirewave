import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosClient from "../api/axiosClient";
import { roleLabel } from "../utils/labels";
import { applyTheme, getTheme } from "../utils/theme";

function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange: () => void; disabled?: boolean; label: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            onClick={onChange}
            disabled={disabled}
            className={`relative inline-flex h-6! w-11! p-0! border-0! items-center rounded-full! transition-colors shrink-0 disabled:opacity-50 ${on ? "bg-blue-600" : "bg-slate-300"}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
        </button>
    );
}

const firstError = (err: any, fallback: string) => {
    const errors = err?.response?.data?.errors;
    return errors ? (Object.values(errors)[0] as string[])[0] : err?.response?.data?.message ?? fallback;
};

export default function SettingsPage() {
    const { user, logout, fetchUser } = useAuth();
    const navigate = useNavigate();

    const [darkMode, setDarkMode] = useState(() => getTheme() === "dark");
    const [savingNotif, setSavingNotif] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [pwd, setPwd] = useState({ current_password: "", password: "", password_confirmation: "" });
    const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [savingPwd, setSavingPwd] = useState(false);

    const [exporting, setExporting] = useState(false);

    const [showDelete, setShowDelete] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState("");
    const [deleteError, setDeleteError] = useState("");
    const [deleting, setDeleting] = useState(false);

    const hasPassword = user?.has_password !== false;

    const toggleDark = () => {
        const next = !darkMode;
        setDarkMode(next);
        applyTheme(next ? "dark" : "light");
    };

    const toggleNotifications = async () => {
        setSavingNotif(true);
        try {
            await axiosClient.put("/api/me/preferences", { notifications_enabled: !user?.notifications_enabled });
            await fetchUser();
        } finally {
            setSavingNotif(false);
        }
    };

    const handlePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingPwd(true);
        setPwdMsg(null);
        try {
            await axiosClient.put("/api/me/password", pwd);
            setPwdMsg({ ok: true, text: hasPassword ? "Password aggiornata." : "Password impostata: ora puoi accedere anche con email e password." });
            setPwd({ current_password: "", password: "", password_confirmation: "" });
            await fetchUser();
        } catch (err: any) {
            setPwdMsg({ ok: false, text: firstError(err, "Errore durante il cambio password.") });
        } finally {
            setSavingPwd(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await axiosClient.get("/api/me/export", { responseType: "blob" });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = `hirewave-dati-${user?.id}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch {
            alert("Errore durante l'esportazione dei dati.");
        } finally {
            setExporting(false);
        }
    };

    const handleDelete = async (e: React.FormEvent) => {
        e.preventDefault();
        setDeleting(true);
        setDeleteError("");
        try {
            await axiosClient.delete("/api/me", {
                data: hasPassword ? { password: deleteConfirm } : { confirm: deleteConfirm },
            });
            await fetchUser(); // la sessione non esiste più: l'utente risulta disconnesso
            navigate("/", { replace: true });
        } catch (err: any) {
            setDeleteError(firstError(err, "Errore durante l'eliminazione dell'account."));
            setDeleting(false);
        }
    };

    const input = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800";
    const linkButton = "w-full text-left text-sm py-2! px-0! border-0! bg-transparent transition-colors";

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

            {/* Preferenze */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preferenze</h2>

                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-slate-800">Tema scuro</p>
                        <p className="text-xs text-slate-500">Interfaccia con colori scuri su questo dispositivo</p>
                    </div>
                    <Toggle on={darkMode} onChange={toggleDark} label="Tema scuro" />
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-slate-800">Notifiche</p>
                        <p className="text-xs text-slate-500">Nuovi messaggi, recensioni, sblocchi e annunci delle aziende che segui</p>
                    </div>
                    <Toggle on={!!user?.notifications_enabled} onChange={toggleNotifications} disabled={savingNotif} label="Notifiche" />
                </div>
            </div>

            {/* Privacy e sicurezza */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-2">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Privacy e Sicurezza</h2>

                <button onClick={() => { setShowPassword((s) => !s); setPwdMsg(null); }} className={`${linkButton} text-slate-700 hover:text-blue-600`}>
                    {hasPassword ? "Cambia password" : "Imposta una password"} →
                </button>
                {showPassword && (
                    <form onSubmit={handlePassword} className="space-y-2 pb-2">
                        {hasPassword ? (
                            <input type="password" autoComplete="current-password" placeholder="Password attuale" required value={pwd.current_password} onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })} className={input} />
                        ) : (
                            <p className="text-xs text-slate-500">Sei entrato con Google o LinkedIn: puoi creare una password per accedere anche con email.</p>
                        )}
                        <input type="password" autoComplete="new-password" placeholder="Nuova password (almeno 8 caratteri)" required minLength={8} value={pwd.password} onChange={(e) => setPwd({ ...pwd, password: e.target.value })} className={input} />
                        <input type="password" autoComplete="new-password" placeholder="Ripeti la nuova password" required minLength={8} value={pwd.password_confirmation} onChange={(e) => setPwd({ ...pwd, password_confirmation: e.target.value })} className={input} />
                        {pwdMsg && <p className={`text-xs ${pwdMsg.ok ? "text-green-600" : "text-red-600"}`}>{pwdMsg.text}</p>}
                        <button type="submit" disabled={savingPwd} className="bg-blue-600 text-white text-sm font-semibold py-2 px-4 rounded-lg disabled:opacity-50">
                            {savingPwd ? "Salvataggio..." : "Salva password"}
                        </button>
                    </form>
                )}

                <button onClick={handleExport} disabled={exporting} className={`${linkButton} text-slate-700 hover:text-blue-600 disabled:opacity-50`}>
                    {exporting ? "Preparazione file..." : "Scarica i miei dati →"}
                </button>

                <button onClick={() => { setShowDelete((s) => !s); setDeleteError(""); }} className={`${linkButton} text-red-500 hover:text-red-700`}>
                    Elimina account →
                </button>
                {showDelete && (
                    <form onSubmit={handleDelete} className="space-y-2 border border-red-200 rounded-xl p-3">
                        <p className="text-xs text-slate-600">
                            L'eliminazione è definitiva: profilo, post, messaggi, recensioni e file caricati verranno cancellati.
                        </p>
                        <input
                            type={hasPassword ? "password" : "text"}
                            autoComplete={hasPassword ? "current-password" : "off"}
                            placeholder={hasPassword ? "Inserisci la tua password per confermare" : "Scrivi ELIMINA per confermare"}
                            required
                            value={deleteConfirm}
                            onChange={(e) => setDeleteConfirm(e.target.value)}
                            className={input}
                        />
                        {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
                        <button type="submit" disabled={deleting || !deleteConfirm} className="bg-red-600 text-white text-sm font-semibold py-2 px-4 rounded-lg disabled:opacity-50">
                            {deleting ? "Eliminazione..." : "Elimina definitivamente"}
                        </button>
                    </form>
                )}
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
