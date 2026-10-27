import { type FormEvent, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import SocialLoginButtons from "../components/SocialLoginButtons";

export default function RegisterPage() {
    const { register, loading } = useAuth();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"WORKER" | "PRO" | "COMPANY">("WORKER");
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== passwordConfirmation) {
            setError("Le password non coincidono.");
            return;
        }

        try {
            await register({
                first_name: firstName,
                last_name: lastName,
                email,
                role,
                password,
                password_confirmation: passwordConfirmation,
            });
            // dopo register l'AuthContext fa già fetchUser → ProtectedRoute ti porta al /feed
        } catch (err: any) {
            setError("Errore durante la registrazione.");
        }
    };

    return (
        <div className="text-black min-h-dvh py-8 flex items-center justify-center bg-slate-50">
            <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-6 sm:p-8">
                <h1 className="text-2xl font-bold mb-6 text-center">
                    Crea il tuo account
                </h1>

                {error && (
                    <div className="mb-4 text-sm text-red-600 border border-red-200 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1 min-w-0">
                            <label className="block text-sm font-medium mb-1">
                                Nome
                            </label>
                            <input
                                type="text"
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <label className="block text-sm font-medium mb-1">
                                Cognome
                            </label>
                            <input
                                type="text"
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Sei:
                        </label>
                        <select
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={role}
                            onChange={(e) => setRole(e.target.value as any)}
                        >
                            <option value="WORKER">Lavoratore</option>
                            <option value="PRO">Freelancer / Professionista</option>
                            <option value="COMPANY">Azienda</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Conferma password
                        </label>
                        <input
                            type="password"
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={passwordConfirmation}
                            onChange={(e) =>
                                setPasswordConfirmation(e.target.value)
                            }
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
                    >
                        {loading ? "Registrazione in corso..." : "Registrati"}
                    </button>
                </form>
                  <div className="mt-4">
                    <SocialLoginButtons />
                </div>
                <p className="mt-4 text-center text-sm text-slate-600">
                    Hai già un account?{" "}
                    <Link to="/login" className="text-blue-600 font-semibold">
                        Accedi
                    </Link>
                </p>
            </div>
        </div>
    );
}
