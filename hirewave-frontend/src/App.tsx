import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import PublicRoute from "./router/PublicRoute";
import ProtectedRoute from "./router/ProtectedRoute";

import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import FeedPage from "./pages/Feed";
import TalentsPage from "./pages/Talents";
import CompaniesPage from "./pages/Companies";
import ProfilePage from "./pages/Profile";

import MainLayout from "./layout/MainLayout";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ROTTE PUBBLICHE (solo se NON loggato) */}
          <Route element={<PublicRoute />}>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* ROTTE PROTETTE (solo se loggato) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/talents" element={<TalentsPage />} />
              <Route path="/companies" element={<CompaniesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;