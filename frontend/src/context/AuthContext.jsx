import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchCurrentUser, loginUser, logoutUser, registerUser } from "../api/auth";
import { clearPersistedState } from "../hooks/usePersistedState";

const AuthContext = createContext(null);

/**
 * There's no token in JS-land to check — auth lives entirely in the
 * HttpOnly `access_token` cookie set by POST /auth/login. So "am I logged
 * in" is answered by asking the server: GET /auth/me either returns the
 * user (cookie valid) or 401s (cookie missing/expired). We do that once
 * on mount so a page refresh doesn't bounce a logged-in user to /login.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading"); // "loading" | "authed" | "guest"

  const refreshSession = useCallback(async () => {
    try {
      const me = await fetchCurrentUser();
      setUser(me);
      setStatus("authed");
      return me;
    } catch {
      setUser(null);
      setStatus("guest");
      return null;
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = useCallback(
    async ({ name, password }) => {
      await loginUser({ name, password });
      return refreshSession();
    },
    [refreshSession]
  );

  const register = useCallback((payload) => registerUser(payload), []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setStatus("guest");
      clearPersistedState("adm.");
      clearPersistedState("mem.");
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role,
        status,
        isAuthed: status === "authed",
        login,
        register,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
