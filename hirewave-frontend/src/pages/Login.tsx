import { type FormEvent, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { useLocation, useSearchParams } from "react-router-dom";
import SocialLoginButtons from "../components/SocialLoginButtons";

const SOCIAL_ERRORS: Record<string, string> = {
  social: "Accesso con Google o LinkedIn non riuscito. Riprova.",
  social_email:
    "Il provider non ha fornito un'email verificata. Usa un altro metodo di accesso.",
};

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const errorState = location.state?.error;
  const socialError = SOCIAL_ERRORS[searchParams.get("error") ?? ""];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError("Credenziali errate o problema di connessione.");
    }
  };

  return (
    <div className="text-black min-h-dvh py-8 flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Accedi a HireWave</h1>

        {socialError && (
          <div className="mb-4 text-sm text-red-600 border border-red-200 rounded-lg px-3 py-2">
            {socialError}
          </div>
        )}

        {error && (
          <div className="mb-4 text-sm text-red-600 border border-red-200 rounded-lg px-3 py-2">
             {errorState} {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Accesso in corso..." : "Accedi"}
          </button>
        </form>

        <div className="mt-4">
          <SocialLoginButtons />
        </div>

        <p className="mt-4 text-center text-sm text-slate-600">
          Non hai un account?{" "}
          <Link to="/register" className="text-blue-600 font-semibold">
            Registrati
          </Link>
        </p>
      </div>
    </div>
  );
}