import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { register } from "../api/auth";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STRENGTH_LEVELS = [
  { label: "Very weak",   color: "#b3261e", bg: "#fbeceb" },
  { label: "Weak",        color: "#b3261e", bg: "#fbeceb" },
  { label: "Fair",        color: "#a06a0f", bg: "#fbf2e3" },
  { label: "Strong",      color: "#1c7c41", bg: "#eaf6ee" },
  { label: "Very strong", color: "#1c7c41", bg: "#eaf6ee" },
];

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPasswordStrength(password) {
  if (!password) return { score: 0, ...STRENGTH_LEVELS[0], label: "" };
  let score = 0;
  if (password.length >= 8)  score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password))   score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  const capped = Math.min(score, 4);
  return { score: capped, ...STRENGTH_LEVELS[capped] };
}

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

function CheckCircleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke="#1c7c41" strokeWidth="1.4" />
      <path d="M5 8.2l2 2 4-4.5" stroke="#1c7c41" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
        {/* Header */}
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

        {/* Error list */}
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

// ─── Modal: Account Created ───────────────────────────────────────────────────

function AccountCreatedModal({ onGoToLogin }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(17,19,22,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, zIndex: 100,
      animation: "fadeOverlay 0.15s ease",
    }}>
      <div style={{
        width: "100%", maxWidth: 360,
        background: "#fff",
        border: "1px solid #d9dce0",
        borderRadius: 12, padding: "24px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
        animation: "slideUp 0.22s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "#eaf6ee",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 16,
        }}>
          <CheckCircleIcon size={20} />
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a1d21", margin: "0 0 8px 0" }}>
          Account created!
        </h2>
        <p style={{ fontSize: 13.5, color: "#5b626c", lineHeight: 1.55, margin: "0 0 20px 0" }}>
          Your account has been set up successfully. You can now sign in.
        </p>
        <button
          onClick={onGoToLogin}
          style={{
            width: "100%", height: 40, borderRadius: 6, border: "none",
            background: "#2855a6", color: "#fff",
            fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >
          Go to login
        </button>
      </div>
    </div>
  );
}

// ─── RegisterPage ─────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Username may be pre-filled when redirected from LoginPage
  // (passed via router state: navigate("/register", { state: { username } }))
  const [email,           setEmail]          = useState("");
  const [username,        setUsername]        = useState(location.state?.username ?? "");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched,         setTouched]         = useState({});
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const [apiError,        setApiError]        = useState("");
  const [showSuccess,     setShowSuccess]     = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);

  const strength = getPasswordStrength(password);

  // ── Live field-level validation ─────────────────────────────────────────────
  const fieldErrors = {};
  if (!email.trim())                        fieldErrors.email           = "Email is required.";
  else if (!EMAIL_REGEX.test(email.trim())) fieldErrors.email           = "Enter a valid email address (e.g. you@company.com).";
  if (!username.trim())                     fieldErrors.username        = "Username is required.";
  if (!password)                            fieldErrors.password        = "Password is required.";
  else if (password.length < 8)             fieldErrors.password        = "Password must be at least 8 characters.";
  if (!confirmPassword)                     fieldErrors.confirmPassword = "Please confirm your password.";
  else if (confirmPassword !== password)    fieldErrors.confirmPassword = "Passwords do not match — please re-enter.";

  // Live password-match indicator (shown only once both fields have content)
  const passwordsMatch   = !!(password && confirmPassword && password === confirmPassword);

  const validationMessages = [
    fieldErrors.email,
    fieldErrors.username,
    fieldErrors.password,
    fieldErrors.confirmPassword,
  ].filter(Boolean);

  const markTouched = (field) => setTouched((t) => ({ ...t, [field]: true }));

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    setTouched({ email: true, username: true, password: true, confirmPassword: true });

    if (validationMessages.length > 0) {
      setShowValidationModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await register(email, username, password);

      if (result.success) {
        setShowSuccess(true);
      } else {
        const msg = result.data?.message ?? result.data ?? "";
        setApiError(
          (typeof msg === "string" && msg) ||
          "Unable to register. Please try again."
        );
      }
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Navigation helpers (React Router) ──────────────────────────────────────
  const goToLogin = () => navigate("/login");

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <div style={{
        width: "100%", minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f4ff 0%, #f5f6f7 60%, #eef6f2 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        padding: 24,
      }}>
        <div style={{
          width: "100%", maxWidth: 400,
          background: "#fff",
          border: "1px solid #e2e5ea",
          borderRadius: 14,
          padding: "38px 34px",
          boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        }}>
          {/* Header */}
          <div style={{ marginBottom: 26 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: "linear-gradient(135deg,#1c7c41,#3db870)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 16,
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2v16M2 10h16" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1d21", margin: "0 0 5px 0", letterSpacing: "-0.02em" }}>
              Create an account
            </h1>
            <p style={{ fontSize: 13.5, color: "#5b626c", lineHeight: 1.5, margin: 0 }}>
              All fields are required. Fill them in to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>

            {/* Email */}
            <FormField label="Email" htmlFor="reg-email" error={fieldErrors.email} touched={touched.email}>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); markTouched("email"); }}
                onBlur={() => markTouched("email")}
                placeholder="you@company.com"
                className="auth-input"
                style={{
                  width: "100%", height: 40,
                  padding: "0 12px", fontSize: 14,
                  border: `1px solid ${touched.email && fieldErrors.email ? "#b3261e" : "#d9dce0"}`,
                  borderRadius: 6, color: "#1a1d21",
                  boxSizing: "border-box", outline: "none",
                  background: touched.email && fieldErrors.email ? "#fff8f8" : "#fff",
                }}
              />
            </FormField>

            {/* Username */}
            <FormField label="Username" htmlFor="reg-username" error={fieldErrors.username} touched={touched.username}>
              <input
                id="reg-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); markTouched("username"); }}
                onBlur={() => markTouched("username")}
                placeholder="Choose a username"
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

            {/* Password */}
            <FormField label="Password" htmlFor="reg-password" error={fieldErrors.password} touched={touched.password}>
              <PasswordInput
                id="reg-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); markTouched("password"); }}
                placeholder="Create a password (min. 8 chars)"
                hasError={touched.password && !!fieldErrors.password}
                autoComplete="new-password"
              />
              {/* Strength bar */}
              {password && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1, display: "flex", gap: 3 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: i < strength.score ? strength.color : "#e8eaed",
                        transition: "background 0.2s",
                      }} />
                    ))}
                  </div>
                  <span style={{
                    fontSize: 11.5, fontWeight: 600,
                    color: strength.score === 0 ? "#9aa0a8" : strength.color,
                    whiteSpace: "nowrap",
                  }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </FormField>

            {/* Confirm Password */}
            <FormField label="Confirm password" htmlFor="reg-confirm" error={fieldErrors.confirmPassword} touched={touched.confirmPassword}>
              <PasswordInput
                id="reg-confirm"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); markTouched("confirmPassword"); }}
                placeholder="Re-enter your password"
                hasError={touched.confirmPassword && !!fieldErrors.confirmPassword}
                autoComplete="new-password"
              />
              {/* Live match indicator */}
              {confirmPassword && (
                <p style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: 12, margin: "5px 0 0 0",
                  color: passwordsMatch ? "#1c7c41" : "#b3261e",
                }}>
                  {passwordsMatch
                    ? <><CheckCircleIcon size={12} /> Passwords match</>
                    : <><AlertIcon size={11} color="#b3261e" /> Passwords do not match</>
                  }
                </p>
              )}
            </FormField>

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
                background: isSubmitting ? "#5aaa78" : "#1c7c41",
                color: "#fff", fontSize: 14, fontWeight: 600,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                marginBottom: 14, transition: "background 0.15s",
              }}
            >
              {isSubmitting && <SpinnerIcon size={15} />}
              {isSubmitting ? "Creating account…" : "Create account"}
            </button>

            <button
              type="button"
              onClick={goToLogin}
              className="auth-link"
              style={{
                background: "none", border: "none", padding: 0,
                fontSize: 13, color: "#2855a6", cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Already have an account? Sign in
            </button>
          </form>
        </div>
      </div>

      {/* Validation modal */}
      {showValidationModal && (
        <ValidationModal
          errors={validationMessages}
          onClose={() => setShowValidationModal(false)}
        />
      )}

      {/* Account Created modal */}
      {showSuccess && (
        <AccountCreatedModal
          onGoToLogin={() => { setShowSuccess(false); goToLogin(); }}
        />
      )}
    </>
  );
}