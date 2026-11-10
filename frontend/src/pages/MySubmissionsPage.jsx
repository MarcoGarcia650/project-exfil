import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";
import { formatDateTime } from "../lib/formatTime.js";

const STATUS_LABELS = { PENDING: "Pending review", ACCEPTED: "Accepted", REJECTED: "Not accepted" };

// /account/submissions — the user's own suggestions, their status and
// any note from the admin. Private: nobody else sees these.
export function MySubmissionsPage() {
  useDocumentTitle("My submissions");
  const { token } = useAuth();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/submissions/mine", token).then(setRows).catch((err) => setError(err.message));
  }, [token]);

  if (error) return <p className="error">{error}</p>;
  if (!rows) return <p>Loading...</p>;

  return (
    <div>
      <h1>My submissions</h1>
      <p className="muted">
        Suggestions are checked against the provider's official page before any listing changes.{" "}
        <Link to="/suggest">Suggest a program</Link>
      </p>
      {rows.length === 0 && <p className="muted">You haven't sent any suggestions yet.</p>}
      <ul className="employer-list">
        {rows.map((s) => (
          <li key={s.id} className="employer-card">
            <div className="tag-row">
              <span className={`badge badge-sub-${s.status.toLowerCase()}`}>{STATUS_LABELS[s.status]}</span>
              <span className="program-meta">
                {s.kind === "LISTING_UPDATE" ? "Listing update" : "New program"} · sent{" "}
                {formatDateTime(s.createdAt)}
              </span>
            </div>
            {s.program && (
              <p className="program-name">
                For {s.program.slug ? <Link to={`/programs/${s.program.slug}`}>{s.program.name}</Link> : s.program.name}
              </p>
            )}
            <p className="comment-text">{s.body}</p>
            {s.sourceUrl && (
              <p className="program-meta">
                Link: <a href={s.sourceUrl} target="_blank" rel="noreferrer noopener">{s.sourceUrl}</a>
              </p>
            )}
            {s.adminNote && (
              <p className="listing-notice">
                <strong>Admin note:</strong> {s.adminNote}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
