import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useErrorModal } from "../context/ErrorModalContext";
import "./AuthPages.css";

export default function RegisterPage() {
  const { register } = useAuth();
  const { reportError } = useErrorModal();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "member" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(form);
      setDone(true);
    } catch (err) {
      reportError(err, "Couldn't create your account");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-card__title">Account created</h1>
          <p className="auth-card__subtitle">You can log in now.</p>
          <button className="btn btn--primary auth-card__submit" onClick={() => navigate("/login")}>
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-card__brand">
          <div className="sidebar__brand-mark">TP</div>
          <span className="sidebar__brand-name">TaskPulse</span>
        </div>

        <h1 className="auth-card__title">Create an account</h1>

        <div className="field">
          <label htmlFor="reg-name">Username</label>
          <input id="reg-name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="reg-email">Email</label>
          <input
            id="reg-email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            minLength={8}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="reg-role">Role</label>
          <select id="reg-role" value={form.role} onChange={(e) => update("role", e.target.value)}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button className="btn btn--primary auth-card__submit" type="submit" disabled={submitting}>
          {submitting ? "Creating\u2026" : "Create account"}
        </button>

        <p className="auth-card__switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
