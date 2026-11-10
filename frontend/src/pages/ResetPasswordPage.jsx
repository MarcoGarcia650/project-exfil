import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";

// /reset-password?token=… — opened from an admin-issued, single-use link.
// On success every existing session for the account ends (server bumps
// tokenVersion), so this browser is logged out too and sent to log in.
export function ResetPasswordPage() {
  useDocumentTitle("Reset password");
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return (
      <div className="auth-form">
        <h1>Reset password</h1>
        <p className="error">This reset link is incomplete. Copy the whole link and try again, or ask for a new one.</p>
        <Link to="/login">Back to log in</Link>
      </div>
    );
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setError("Passwords don't match");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, password: form.password });
      logout();
      navigate("/login", { replace: true, state: { notice: "Password updated. Log in with your new password." } });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h1>Reset password</h1>
      {error && <p className="error">{error}</p>}
      <label>
        New password
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <span className="field-hint">At least 8 characters. This logs you out everywhere else.</span>
      </label>
      <label>
        Confirm new password
        <input
          type="password"
          name="confirm"
          value={form.confirm}
          onChange={handleChange}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Set new password"}
      </button>
    </form>
  );
}
