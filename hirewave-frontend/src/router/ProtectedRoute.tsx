import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  // Finché non abbiamo finito di caricare lo stato utente, NON redirectiamo
  if (loading) {
    return null; // oppure un loader / spinner
  }

  // Se non c'è utente loggato → mandiamo alla login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Utente loggato → accesso consentito
  return <Outlet />;
}
