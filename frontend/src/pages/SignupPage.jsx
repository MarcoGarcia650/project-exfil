import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const BRANCHES = ["ARMY", "NAVY", "AIR_FORCE", "MARINES", "COAST_GUARD", "SPACE_FORCE", "MILITARY_SPOUSE"];

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Return to the page that sent the visitor here (e.g. "Log in to save").
  const from = location.state?.from;
  const next = from ? `${from.pathname}${from.search ?? ""}` : "/programs";
  const [form, setForm] = useState({ email: "", password: "", branch: BRANCHES[0], targetField: "" });
  const [error, setError] = useState(null);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await signup(form);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h1>Sign up</h1>
      {error && <p className="error">{error}</p>}
      <label>
        Email
        <input type="email" name="email" value={form.email} onChange={handleChange} required />
      </label>
      <label>
        Password
        <input type="password" name="password" value={form.password} onChange={handleChange} required />
      </label>
      <label>
        Branch
        <select name="branch" value={form.branch} onChange={handleChange}>
          {BRANCHES.map((b) => (
            <option key={b} value={b}>
              {b.replace("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <label>
        Target field <span className="optional">(optional)</span>
        <input type="text" name="targetField" value={form.targetField} onChange={handleChange} />
      </label>
      <button type="submit">Create account</button>
      <p>
        Already have an account? <Link to="/login" state={location.state}>Log in</Link>
      </p>
    </form>
  );
}
