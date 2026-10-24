import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

type Role = "WORKER" | "PRO" | "COMPANY";

const ROLES: { value: Role; label: string }[] = [
    { value: "WORKER", label: "Lavoratore" },
    { value: "PRO", label: "Freelancer / Professionista" },
    { value: "COMPANY", label: "Azienda" },
];

export default function SocialRolePage() {
    const { fetchUser } = useAuth();
    const navigate = useNavigate();
    const [role, setRole] = useState<Role>("WORKER");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaving(true);

        try {
            await axiosClient.post("/api/auth/social/complete", { role });
            await fetchUser();
            navigate("/feed", { replace: true });
        } catch (err: any) {
            setError(
                err?.response?.data?.message ??
                    "Errore durante la registrazione. Riprova.",
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="text-black h-dvh overflow-hidden flex items-center justify-center bg-slate-50">
            <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8">
                <h1 className="text-2xl font-bold mb-2 text-center">
                    Completa la registrazione
                </h1>
                <p className="text-sm text-slate-500 mb-6 text-center">
                    Scegli come vuoi usare HireWave.
                </p>

                {error && (
                    <div className="mb-4 text-sm text-red-600 border border-red-200 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        {ROLES.map((r) => (
                            <label
                                key={r.value}
                                className={`flex items-center gap-3 border rounded-lg px-3 py-2 text-sm cursor-pointer ${
                                    role === r.value
                                        ? "border-blue-600 bg-blue-50"
                                        : "border-slate-200"
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="role"
                                    value={r.value}
                                    checked={role === r.value}
                                    onChange={() => setRole(r.value)}
                                />
                                {r.label}
                            </label>
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
                    >
                        {saving ? "Salvataggio..." : "Continua"}
                    </button>
                </form>

                <p className="mt-4 text-center text-sm text-slate-600">
                    <Link to="/" className="text-blue-600 font-semibold">
                        Torna all'accesso
                    </Link>
                </p>
            </div>
        </div>
    );
}