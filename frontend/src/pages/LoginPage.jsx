import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ─── Global styles (injected once per page mount) ─────────────────────────────

const GLOBAL_STYLES = `
  * { box-sizing: border-box; }
  .auth-input::placeholder { color: #9aa0a8; }
  .auth-input:focus {
    border-color: #2855a6 !important;
    box-shadow: 0 0 0 3px rgba(40,85,166,0.12);
    background: #fff !important;
  }
  .auth-link:hover { color: #1f4488; }
  .auth-btn-primary:not(:disabled):hover { filter: brightness(1.1); }
  @keyframes fadeOverlay { from { opacity:0 } to { opacity:1 } }
  @keyframes slideUp {
    from { opacity:0; transform:translateY(18px) scale(0.97) }
    to   { opacity:1; transform:translateY(0)    scale(1)    }
  }
  @keyframes spin { to { transform: rotate(360deg) } }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

function SpinnerIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none"
      style={{ animation: "spin 0.75s linear infinite", flexShrink: 0 }}>
      <circle cx="9" cy="9" r="7" stroke="#d9dce0" strokeWidth="2" />
      <path d="M9 2a7 7 0 017 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon({ size = 16, color = "#b3261e" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke={color} strokeWidth="1.4" />
      <path d="M8 5v4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="11" r="0.6" fill={color} />
    </svg>
  );
}

function XIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ visible }) {
  return visible ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="#5b626c" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="2" stroke="#5b626c" strokeWidth="1.4" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="#5b626c" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="2" stroke="#5b626c" strokeWidth="1.4" />
      <path d="M2 2l12 12" stroke="#5b626c" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// ─── Shared: FormField ────────────────────────────────────────────────────────

function FormField({ label, htmlFor, error, touched, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={htmlFor} style={{
        display: "block", fontSize: 13, fontWeight: 600,
        color: "#1a1d21", marginBottom: 6, letterSpacing: "0.01em",
      }}>
        {label} <span style={{ color: "#b3261e" }}>*</span>
      </label>
      {children}
      {touched && error && (
        <p style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 12, color: "#b3261e", margin: "5px 0 0 0", lineHeight: 1.4,
        }}>
          <AlertIcon size={11} />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Shared: PasswordInput ────────────────────────────────────────────────────

function PasswordInput({ id, value, onChange, placeholder, hasError, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="auth-input"
        style={{
          width: "100%", height: 40,
          padding: "0 40px 0 12px", fontSize: 14,
          border: `1px solid ${hasError ? "#b3261e" : "#d9dce0"}`,
          borderRadius: 6, color: "#1a1d21",
          boxSizing: "border-box", outline: "none",
          background: hasError ? "#fff8f8" : "#fff",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer", padding: 2,
          display: "flex", alignItems: "center", color: "#5b626c",
        }}
        aria-label={show ? "Hide password" : "Show password"}
      >
        <EyeIcon visible={show} />
      </button>
    </div>
  );
}

// ─── Modal: Validation Errors ─────────────────────────────────────────────────

function ValidationModal({ errors, onClose }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(17,19,22,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, zIndex: 100,
        animation: "fadeOverlay 0.15s ease",
      }}
    >
      <div style={{
        width: "100%", maxWidth: 360,
        background: "#fff",
        border: "1px solid #f0c5c3",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
        animation: "slideUp 0.22s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px 14px",
          borderBottom: "1px solid #fce8e7",
          background: "#fff8f8",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#fbeceb",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <AlertIcon size={16} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1d21" }}>
                Please fix the following
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "#5b626c" }}>
                {errors.length} issue{errors.length > 1 ? "s" : ""} found
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6,
              border: "1px solid #d9dce0", background: "transparent",
              color: "#5b626c", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer",
            }}
          >
            <XIcon size={12} />
          </button>
        </div>

        <div style={{ padding: "14px 20px 20px" }}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {errors.map((err, i) => (
              <li key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "10px 12px",
                background: "#fff8f8",
                border: "1px solid #fce8e7",
                borderRadius: 8,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: "#fbeceb",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, marginTop: 1,
                  fontSize: 11, fontWeight: 700, color: "#b3261e",
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 13, color: "#5b626c", lineHeight: 1.5 }}>{err}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={onClose}
            style={{
              marginTop: 16, width: "100%", height: 40,
              borderRadius: 6, border: "none",
              background: "#2855a6", color: "#fff",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Fix these issues
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Account Not Found ─────────────────────────────────────────────────

function AccountNotFoundModal({ username, onClose, onRegister }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(17,19,22,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, zIndex: 100,
        animation: "fadeOverlay 0.15s ease",
      }}
    >
      <div style={{
        width: "100%", maxWidth: 360,
        background: "#fff",
        border: "1px solid #d9dce0",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
        animation: "slideUp 0.22s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <div style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", padding: "20px 20px 0",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "#fbeceb",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <AlertIcon size={18} />
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6,
              border: "1px solid #d9dce0", background: "transparent",
              color: "#5b626c", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer",
            }}
          >
            <XIcon size={12} />
          </button>
        </div>
        <div style={{ padding: "14px 20px 22px" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a1d21", margin: "0 0 8px 0" }}>
            Account not found
          </h2>
          <p style={{ fontSize: 13.5, color: "#5b626c", lineHeight: 1.55, margin: "0 0 20px 0" }}>
            No account found for <strong>"{username}"</strong>. Double-check the username or create a new account.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, height: 40, borderRadius: 6,
                border: "1px solid #d9dce0", background: "transparent",
                color: "#1a1d21", fontSize: 14, fontWeight: 500, cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={onRegister}
              style={{
                flex: 1, height: 40, borderRadius: 6,
                border: "none", background: "#2855a6",
                color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              Register now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LoginPage ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  // Username may be pre-filled when redirected from RegisterPage
  // (passed via router state: navigate("/login", { state: { username } }))
  const [username, setUsername]         = useState(location.state?.username ?? "");
  const [password, setPassword]         = useState("");
  const [touched,  setTouched]          = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError,     setApiError]     = useState("");
  const [showNotFoundModal,   setShowNotFoundModal]   = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);

  // ── Live field-level validation ─────────────────────────────────────────────
  const fieldErrors = {};
  if (!username.trim()) fieldErrors.username = "Username is required.";
  if (!password)        fieldErrors.password = "Password is required.";

  const validationMessages = [
    !username.trim() && "Username cannot be empty.",
    !password        && "Password cannot be empty.",
  ].filter(Boolean);

  const markTouched = (field) => setTouched((t) => ({ ...t, [field]: true }));

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    setTouched({ username: true, password: true });

    if (validationMessages.length > 0) {
      setShowValidationModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      // login() now comes from AuthContext, not api/auth.js directly:
      // it posts credentials, then immediately calls /me to populate
      // the session (role, id, username) since the login response
      // itself carries no user info — the cookie is httpOnly.
      const result = await login(username, password);

      if (!result.success) {
        const msg = result.data?.message ?? result.data ?? "";
        if (typeof msg === "string" && msg.toLowerCase().includes("user doesnt exist")) {
          setShowNotFoundModal(true);
        } else {
          setApiError(
            (typeof msg === "string" && msg) ||
            "Unable to log in. Please check your credentials and try again."
          );
        }
        return;
      }

      // Successful login — /me has already populated AuthContext's user.
      // Route by role rather than assuming everyone lands on /admin.
      if (result.user?.role === "Admin") {
        navigate("/admin");
      } 
      else if (result.user?.role === "Member"){
        navigate("/member")
      }
      else if (result.user?.role === "SuperAdmin") {
        navigate("/superadmin");
      }
      else {
        navigate("/"); // adjust to wherever non-admin members should land
      }
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Navigation helpers (React Router) ──────────────────────────────────────
  const goToRegister = (prefillUsername = "") =>
    navigate("/register", { state: { username: prefillUsername } });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <div style={{
        width: "100%", minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f4ff 0%, #f5f6f7 60%, #eef6f2 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        // padding: 24,
      }}>
        <div style={{
          width: "100%", maxWidth: 400,
          background: "#fff",
          border: "1px solid #e2e5ea",
          borderRadius: 14,
          padding: "38px 34px",
          boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: "linear-gradient(135deg,#2855a6,#5b82d6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 16,
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="7" r="3.5" stroke="#fff" strokeWidth="1.6" />
                <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1d21", margin: "0 0 5px 0", letterSpacing: "-0.02em" }}>
              Sign in
            </h1>
            <p style={{ fontSize: 13.5, color: "#5b626c", lineHeight: 1.5, margin: 0 }}>
              Enter your credentials to access your workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <FormField
              label="Username"
              htmlFor="login-username"
              error={fieldErrors.username}
              touched={touched.username}
            >
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); markTouched("username"); }}
                onBlur={() => markTouched("username")}
                placeholder="Enter your username"
                className="auth-input"
                style={{
                  width: "100%", height: 40,
                  padding: "0 12px", fontSize: 14,
                  border: `1px solid ${touched.username && fieldErrors.username ? "#b3261e" : "#d9dce0"}`,
                  borderRadius: 6, color: "#1a1d21",
                  boxSizing: "border-box", outline: "none",
                  background: touched.username && fieldErrors.username ? "#fff8f8" : "#fff",
                }}
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="login-password"
              error={fieldErrors.password}
              touched={touched.password}
            >
              <PasswordInput
                id="login-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); markTouched("password"); }}
                placeholder="Enter your password"
                hasError={touched.password && !!fieldErrors.password}
                autoComplete="current-password"
              />
            </FormField>

            <div style={{ margin: "10px 0 18px" }}>
              <button
                type="button"
                onClick={() => goToRegister(username)}
                className="auth-link"
                style={{
                  background: "none", border: "none", padding: 0,
                  fontSize: 13, color: "#2855a6", cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Don't have an account? Register now
              </button>
            </div>

            {apiError && (
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "10px 12px",
                background: "#fff8f8", border: "1px solid #fce8e7",
                borderRadius: 8, marginBottom: 14,
              }}>
                <AlertIcon size={13} />
                <span style={{ fontSize: 13, color: "#b3261e" }}>{apiError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="auth-btn-primary"
              style={{
                width: "100%", height: 42, borderRadius: 8, border: "none",
                background: isSubmitting ? "#7a99cc" : "#2855a6",
                color: "#fff", fontSize: 14, fontWeight: 600,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "background 0.15s",
              }}
            >
              {isSubmitting && <SpinnerIcon size={15} />}
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>

      {showValidationModal && (
        <ValidationModal
          errors={validationMessages}
          onClose={() => setShowValidationModal(false)}
        />
      )}

      {showNotFoundModal && (
        <AccountNotFoundModal
          username={username}
          onClose={() => setShowNotFoundModal(false)}
          onRegister={() => {
            setShowNotFoundModal(false);
            goToRegister(username);
          }}
        />
      )}
    </>
  );
}