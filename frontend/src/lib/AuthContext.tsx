import React from "react";
import { api } from "./api";

type Employee = { id: number; name: string; login: string; role: string };

type AuthState = {
  token: string | null;
  employee: Employee | null;
  ready: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = React.createContext<AuthState | null>(null);

const TOKEN_KEY = "cyberos_admin_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [employee, setEmployee] = React.useState<Employee | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (!token) {
      setEmployee(null);
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    api
      .authMe()
      .then((me) => {
        if (!cancelled) setEmployee(me as Employee);
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setEmployee(null);
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  React.useEffect(() => {
    const onAuth = () => setToken(localStorage.getItem(TOKEN_KEY));
    window.addEventListener("cyberos:auth", onAuth);
    return () => window.removeEventListener("cyberos:auth", onAuth);
  }, []);

  const login = React.useCallback(async (loginStr: string, password: string) => {
    const res = await api.authLogin(loginStr, password);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setToken(res.access_token);
  }, []);

  const logout = React.useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setEmployee(null);
    window.dispatchEvent(new Event("cyberos:auth"));
  }, []);

  const value = React.useMemo(
    () => ({ token, employee, ready, login, logout }),
    [token, employee, ready, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
