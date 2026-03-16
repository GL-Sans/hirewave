import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PublicRoute() {
  const { user, loading } = useAuth();

  // Finché non sappiamo se l'utente è loggato, non facciamo redirect
  if (loading) {
    return null; // oppure un loader / spinner
  }

  // Se l'utente è già loggato, NON ha senso stargli in login/registrazione
  if (user) {
    return <Navigate to="/feed" replace />;
  }

  // Utente non loggato → può vedere la route pubblica (login/register)
  return <Outlet />;
}
