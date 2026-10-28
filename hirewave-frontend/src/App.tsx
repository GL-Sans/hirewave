import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import PublicRoute from "./router/PublicRoute";
import ProtectedRoute from "./router/ProtectedRoute";

import LoginPage from "./pages/Login";
import FeedPage from "./pages/Feed";

import MainLayout from "./layout/MainLayout";
import GuestLayout from "./layout/GuestLayout";

// Ogni pagina si scarica quando serve: il primo caricamento resta leggero
const RegisterPage = lazy(() => import("./pages/Register"));
const SocialRolePage = lazy(() => import("./pages/SocialRole"));
const TalentsPage = lazy(() => import("./pages/Talents"));
const CompaniesPage = lazy(() => import("./pages/Companies"));
const ProfilePage = lazy(() => import("./pages/Profile"));
const CreatePostPage = lazy(() => import("./pages/CreatePost"));
const ChatPage = lazy(() => import("./pages/Chat"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const CurriculumPage = lazy(() => import("./pages/Curriculum"));
const OnboardingPage = lazy(() => import("./pages/Onboarding"));
const NotFoundPage = lazy(() => import("./pages/NotFound"));
const NotificationsPage = lazy(() => import("./pages/Notifications"));
const AdminDocumentiPage = lazy(() => import("./pages/AdminDocumenti"));
const AbbonamentiPage = lazy(() => import("./pages/Abbonamenti"));

function PageFallback() {
    return (
        <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Suspense fallback={<PageFallback />}>
                    <Routes>
                        {/* ROTTE PUBBLICHE (solo se NON loggato) */}
                        <Route element={<GuestLayout />}>
                            <Route element={<PublicRoute />}>
                                <Route path="/" element={<LoginPage />} />
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/register" element={<RegisterPage />} />
                                <Route path="/auth/social/role" element={<SocialRolePage />} />
                            </Route>
                        </Route>
                        {/* ROTTE PROTETTE (solo se loggato) */}
                        <Route element={<ProtectedRoute />}>
                            <Route element={<MainLayout />}>
                                <Route path="/onboarding" element={<OnboardingPage />} />
                                <Route path="/feed" element={<FeedPage />} />
                                <Route path="/talents" element={<TalentsPage />} />
                                <Route path="/companies" element={<CompaniesPage />} />
                                <Route path="/profile" element={<ProfilePage />} />
                                <Route path="/profile/:name" element={<ProfilePage />} />
                                <Route path="/profile/:name/curriculum" element={<CurriculumPage />} />
                                <Route path="/create" element={<CreatePostPage />} />
                                <Route path="/chat" element={<ChatPage />} />
                                <Route path="/notifications" element={<NotificationsPage />} />
                                <Route path="/abbonamenti" element={<AbbonamentiPage />} />
                                <Route path="/admin/documenti" element={<AdminDocumentiPage />} />
                                <Route path="/settings" element={<SettingsPage />} />
                            </Route>
                        </Route>
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </Suspense>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
