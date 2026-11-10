import { useState } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";

// For accounts created before usernames existed. A username is only
// needed to take part publicly (comments, later); saving and tracking work
// without one, so this is offered, not forced.
export function ChooseUsernamePage() {
  useDocumentTitle("Choose a username");
  const { token, user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Return to where the prompt came from (e.g. a discussion), else the dashboard.
  const from = location.state?.from;
  const next = from ? `${from.pathname}${from.search ?? ""}` : "/dashboard";
  const [username, setUsername] = useState("");
  const [error, setError] = useState(null);

  if (user?.username) return <Navigate to={next} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/auth/username", { username }, token);
      await refreshUser();
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h1>Choose a username</h1>
      <p className="muted">
        Your username is how others will see you in discussions. Your email is never shown.
      </p>
      {error && <p className="error">{error}</p>}
      <label>
        Username
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          maxLength={20}
          pattern="[A-Za-z][A-Za-z0-9_]{2,19}"
          autoComplete="username"
        />
        <span className="field-hint">
          3–20 letters, numbers or underscores, starting with a letter. Can't be changed later.
        </span>
      </label>
      <button type="submit">Save username</button>
    </form>
  );
}
