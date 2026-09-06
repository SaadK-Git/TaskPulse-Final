import { createContext, useCallback, useContext, useState } from "react";
import ErrorModal from "../components/ErrorModal";

const ErrorModalCtx = createContext(null);

export function ErrorModalProvider({ children }) {
  const [error, setError] = useState(null);

  const reportError = useCallback((err, fallbackTitle = "Something went wrong") => {
    if (!err) return;
    setError({
      title: err?.status === 0 ? "Connection problem" : fallbackTitle,
      message: err?.message || "Unexpected error.",
      status: err?.status,
    });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <ErrorModalCtx.Provider value={{ reportError, clearError }}>
      {children}
      {error && <ErrorModal error={error} onClose={clearError} />}
    </ErrorModalCtx.Provider>
  );
}

export function useErrorModal() {
  const ctx = useContext(ErrorModalCtx);
  if (!ctx) throw new Error("useErrorModal must be used inside ErrorModalProvider");
  return ctx;
}
