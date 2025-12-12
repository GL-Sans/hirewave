import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";


export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  // Finché non abbiamo finito di caricare lo stato utente, NON redirectiamo
  if (loading) {
    return null;
  }

  // Se non c'è utente loggato → mandiamo alla login con messaggio di errore
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          error: "Devi effettuare l’accesso per visualizzare questa pagina",
          from: location.pathname,
        }}
      />
    );
  }

  // Utente loggato → accesso consentito
  return <Outlet />;
}
