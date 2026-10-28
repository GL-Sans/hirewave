import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PublicRoute() {
  const { user, initializing } = useAuth();

  // Finché non sappiamo se l'utente è loggato, non facciamo redirect.
  // Solo al primo avvio: durante login/registrazione la pagina resta montata,
  // altrimenti gli errori del modulo (es. email già usata) sparivano
  if (initializing) {
    return null;
  }

  // Se l'utente è già loggato, NON ha senso stargli in login/registrazione
  if (user) {
    return <Navigate to="/feed" replace />;
  }

  // Utente non loggato → può vedere la route pubblica (login/register)
  return <Outlet />;
}
