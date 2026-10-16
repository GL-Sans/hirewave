import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          error: "Devi effettuare l'accesso per visualizzare questa pagina",
          from: location.pathname,
        }}
      />
    );
  }

  if (!user.onboarding_completato && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}