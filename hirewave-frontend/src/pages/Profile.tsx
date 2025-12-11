import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (loading && !user) {
    return null;
  }

  if (!user) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <p className="text-sm text-slate-600">
          Nessun utente autenticato. Effettua il login.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Profilo</h1>
        <p className="text-sm text-slate-500">
          Le informazioni del tuo account HireWave.
        </p>
      </div>

      <div className="space-y-4 text-sm">
        <div>
          <span className="block text-xs font-semibold text-slate-500">
            Nome
          </span>
          <span className="block text-slate-900">{user.name}</span>
        </div>

        <div>
          <span className="block text-xs font-semibold text-slate-500">
            Email
          </span>
          <span className="block text-slate-900">{user.email}</span>
        </div>

        <div>
          <span className="block text-xs font-semibold text-slate-500">
            Ruolo
          </span>
          <span className="inline-flex px-2 py-1 rounded-full bg-slate-100 text-xs text-slate-700 capitalize">
            {user.role}
          </span>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full border border-red-200 text-red-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-red-50"
        >
          Esci dall’account
        </button>
      </div>
    </div>
  );
}