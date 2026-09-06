import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useErrorModal } from "../context/ErrorModalContext";
import "./AuthPages.css";

export default function LoginPage() {
  const { login } = useAuth();
  const { reportError } = useErrorModal();
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await login({ name, password });
      const fallback = user?.role === "admin" ? "/admin" : "/member";
      navigate(location.state?.from?.pathname || fallback, { replace: true });
    } catch (err) {
      reportError(err, "Couldn't log you in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-card__brand">
          <div className="sidebar__brand-mark">TP</div>
          <span className="sidebar__brand-name">TaskPulse</span>
        </div>

        <h1 className="auth-card__title">Log in</h1>
        <p className="auth-card__subtitle">Watch your background jobs run in real time.</p>

        <div className="field">
          <label htmlFor="login-name">Username</label>
          <input
            id="login-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button className="btn btn--primary auth-card__submit" type="submit" disabled={submitting}>
          {submitting ? "Logging in\u2026" : "Log in"}
        </button>

        <p className="auth-card__switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
