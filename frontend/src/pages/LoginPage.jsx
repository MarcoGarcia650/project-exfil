import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Return to the page that sent the visitor here (e.g. "Log in to save").
  const from = location.state?.from;
  const next = from ? `${from.pathname}${from.search ?? ""}` : "/programs";
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await login(form.email, form.password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h1>Log in</h1>
      {location.state?.notice && <p className="success">{location.state.notice}</p>}
      {error && <p className="error">{error}</p>}
      <label>
        Email
        <input type="email" name="email" value={form.email} onChange={handleChange} required autoComplete="email" />
      </label>
      <label>
        Password
        <input type="password" name="password" value={form.password} onChange={handleChange} required autoComplete="current-password" />
      </label>
      <button type="submit">Log in</button>
      <p className="field-hint">
        Forgot your password? Contact the site admin for a reset link.
      </p>
      <p>
        Need an account? <Link to="/signup" state={location.state}>Sign up</Link>
      </p>
    </form>
  );
}
