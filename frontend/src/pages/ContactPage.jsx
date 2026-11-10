import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";

// /contact — message the admin. Logged-in users only (replies appear on
// "My messages"); suspended users can still write.
export function ContactPage() {
  useDocumentTitle("Contact");
  const { token, isAuthenticated } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ subject: "", body: "" });
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="empty-state">
        <h1>Message sent</h1>
        <p>
          The admin's reply will appear on <Link to="/account/messages">My messages</Link>.
        </p>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await api.post("/contact", form, token);
      setSent(true);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  }

  return (
    <div className="prose-page">
      <h1>Contact the admin</h1>
      <p className="page-lede">
        Questions about a listing, your account, or the site. To suggest a program or a correction, use{" "}
        <Link to="/suggest">Suggest a program</Link> instead, so it goes into the review queue.
      </p>
      {!isAuthenticated ? (
        <p className="composer-gate">
          <Link to="/login" state={{ from: location }}>Log in</Link> or{" "}
          <Link to="/signup" state={{ from: location }}>sign up</Link> to send a message. Forgot your password? See the{" "}
          <Link to="/faq">FAQ</Link>.
        </p>
      ) : (
        <form className="auth-form wide-form" onSubmit={handleSubmit}>
          {error && <p className="error">{error}</p>}
          <label>
            Subject
            <input
              name="subject"
              value={form.subject}
              maxLength={120}
              required
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </label>
          <label>
            Message
            <textarea
              name="body"
              rows={7}
              maxLength={3000}
              required
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
            <span className="field-hint">Only the admin sees this. Up to 5 messages a day.</span>
          </label>
          <button type="submit" disabled={sending || !form.subject.trim() || !form.body.trim()}>
            {sending ? "Sending…" : "Send message"}
          </button>
        </form>
      )}
    </div>
  );
}
