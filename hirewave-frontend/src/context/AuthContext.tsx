import { createContext, useContext, useEffect, useRef, useState } from "react";
import axiosClient from "../api/axiosClient";

interface User {
  id: number;
  name: string;
  email: string;
  role: "worker" | "pro" | "company";
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: "worker" | "pro" | "company";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Per evitare che React.StrictMode richiami due volte l'effetto
  const initializedRef = useRef(false);

  // Carica sessione utente da Laravel
  const fetchUser = async () => {
    try {
      const res = await axiosClient.get("/api/me");   // << QUI
      setUser(res.data.user);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        setUser(null);
        return;
      }
      console.error("Errore fetchUser:", error);
    }
  };


  // SOLO all'avvio
  useEffect(() => {
    if (initializedRef.current) return; // blocca il doppio run in StrictMode
    initializedRef.current = true;

    (async () => {
      await fetchUser();   // prova a caricare l'utente
      setLoading(false);   // termina fase di loading
    })();
  }, []);

  // Login
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await axiosClient.get("/sanctum/csrf-cookie");
      await axiosClient.post("/api/login", { email, password });
      await fetchUser();
    } finally {
      setLoading(false);
    }
  };

  // Registrazione
  const register = async (data: RegisterData) => {
    setLoading(true);
    try {
      await axiosClient.get("/sanctum/csrf-cookie");
      await axiosClient.post("/api/register", data);
      await fetchUser();
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    setLoading(true);
    try {
      await axiosClient.post("/api/logout");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext) as AuthContextType;
