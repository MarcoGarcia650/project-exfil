import { useState, useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";

// /suggest                → suggest a new program (NEW_LISTING_LEAD)
// /suggest?program=<slug> → suggest an update to that listing (LISTING_UPDATE)
// Submissions never change a listing directly: the admin reviews them and
// checks the provider's official page before anything is published.
export function SuggestPage() {
  const [params] = useSearchParams();
  const slug = params.get("program");
  const isUpdate = Boolean(slug);
  useDocumentTitle(isUpdate ? "Suggest an update" : "Suggest a program");
  const { token, isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [program, setProgram] = useState(null);
  const [programMissing, setProgramMissing] = useState(false);
  const [form, setForm] = useState({ body: "", sourceUrl: "" });
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api
      .get(`/programs/${encodeURIComponent(slug)}`)
      .then(setProgram)
      .catch(() => setProgramMissing(true));
  }, [slug]);

  const heading = isUpdate ? "Suggest an update" : "Suggest a program";
  const intro = isUpdate
    ? "Spotted something out of date or wrong on this listing? Tell us what changed."
    : "Know a tech career program open to veterans after separation that we're missing? Tell us about it.";

  if (sent) {
    return (
      <div className="empty-state">
        <h1>Thanks, it's in</h1>
        <p>
          An admin will check it against the provider's official page. You can follow its status on{" "}
          <Link to="/account/submissions">your submissions</Link>.
        </p>
        <div className="empty-state-actions">
          <Link to={program ? `/programs/${program.slug}` : "/programs"}>
            {program ? "Back to the listing" : "Back to programs"}
          </Link>
        </div>
      </div>
    );
  }

  if (isUpdate && programMissing) {
    return (
      <div className="empty-state">
        <h1>{heading}</h1>
        <p>We couldn't find that listing. You can still <Link to="/suggest">suggest a new program</Link>.</p>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await api.post(
        "/submissions",
        {
          kind: isUpdate ? "LISTING_UPDATE" : "NEW_LISTING_LEAD",
          ...(isUpdate && { programSlug: slug }),
          body: form.body,
          sourceUrl: form.sourceUrl || undefined,
        },
        token
      );
      setSent(true);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  }

  return (
    <div className="suggest-page">
      <h1>{heading}</h1>
      {isUpdate && program && (
        <p className="program-name">
          For <Link to={`/programs/${program.slug}`}>{program.name}</Link> · {program.organization.name}
        </p>
      )}
      <p className="muted">{intro}</p>

      {!isAuthenticated ? (
        <p className="composer-gate">
          <Link to="/login" state={{ from: location }}>Log in</Link> or{" "}
          <Link to="/signup" state={{ from: location }}>sign up</Link> to send a suggestion.
        </p>
      ) : user?.suspended ? (
        <p className="composer-gate">This account is suspended and can't send suggestions.</p>
      ) : (
        <form className="auth-form suggest-form" onSubmit={handleSubmit}>
          {error && <p className="error">{error}</p>}
          <label>
            {isUpdate ? "What should change?" : "Program name, provider, and why it fits"}
            <textarea
              name="body"
              rows={6}
              maxLength={5000}
              required
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
            <span className="field-hint">Only the admin sees this.</span>
          </label>
          <label>
            Link to the official page <span className="optional">(optional)</span>
            <input
              type="url"
              name="sourceUrl"
              placeholder="https://"
              maxLength={500}
              value={form.sourceUrl}
              onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
            />
          </label>
          <button type="submit" disabled={sending || !form.body.trim()}>
            {sending ? "Sending..." : "Send suggestion"}
          </button>
        </form>
      )}
    </div>
  );
}
