import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { login as loginRequest } from "../api/auth.js";

const API_BASE = "http://localhost:8000/api";
const AUTH_BASE = "http://localhost:8000/api/auth";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch(`${AUTH_BASE}/me`, { credentials: "include" });
      if (!res.ok) {
        setUser(null);
        return null;
      }
      const data = await res.json();
      setUser(data);
      return data;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  // Restore session on refresh / initial load — the cookie survives,
  // React state does not, so we ask the backend who's logged in.
  useEffect(() => {
    fetchMe().finally(() => setLoading(false));
  }, [fetchMe]);

  async function login(username, password) {
    const result = await loginRequest(username, password);
    if (result.success) {
      const me = await fetchMe();
      return { success: true, user: me };
    }
    return result;
  }

  async function logout() {
    try {
      await fetch(`${AUTH_BASE}/logout`, { method: "POST", credentials: "include" });
    } catch {
      // even if the request fails, clear local state so the UI reflects logged-out
    }
    setUser(null);
  }

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    refresh: fetchMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}