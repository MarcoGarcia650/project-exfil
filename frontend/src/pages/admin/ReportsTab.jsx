import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDateTime } from "../../lib/formatTime.js";
import { useAdminList, useAdminAction } from "./useAdminApi.js";

function ReportedComment({ c, onDone }) {
  const { run, busy, error } = useAdminAction();
  const [reason, setReason] = useState("");
  const author = c.author;

  async function act(path, body) {
    if (await run(path, body)) onDone();
  }

  return (
    <li className="employer-card admin-item">
      <p className="program-meta">
        On <Link to={`/programs/${c.program.slug}`}>{c.program.name}</Link> ·{" "}
        <Link to={`/comments/${c.id}`}>view in thread</Link> · posted {formatDateTime(c.createdAt)}
      </p>
      <p>
        <strong>{author.username ?? "(no username)"}</strong>
        {author.suspendedAt && <span className="badge badge-closed admin-inline-badge">suspended</span>}
        {c.hiddenAt && <span className="badge admin-inline-badge">already hidden</span>}
      </p>
      <blockquote className="comment-text admin-quote">{c.body}</blockquote>

      <h3 className="admin-subhead">
        {c.reports.length} open {c.reports.length === 1 ? "report" : "reports"}
      </h3>
      <ul className="admin-reports">
        {c.reports.map((r) => (
          <li key={r.id}>
            <span className="comment-text">{r.reason}</span>{" "}
            <span className="program-meta">
              by {r.reporter.username ?? "(no username)"}, {formatDateTime(r.createdAt)}
            </span>
          </li>
        ))}
      </ul>

      {error && <p className="error">{error}</p>}
      <div className="admin-actions">
        {!c.hiddenAt && (
          <>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder="Reason for hiding (admin-only)"
              aria-label="Reason for hiding"
            />
            <button disabled={busy || !reason.trim()} onClick={() => act(`/admin/comments/${c.id}/hide`, { reason })}>
              Hide comment
            </button>
          </>
        )}
        {c.hiddenAt && (
          <button disabled={busy} onClick={() => act(`/admin/comments/${c.id}/hide`, { reason: c.hiddenReason || "Already hidden" })}>
            Close reports (already hidden)
          </button>
        )}
        {!author.suspendedAt && author.role !== "ADMIN" && (
          <button
            className="button-danger"
            disabled={busy}
            onClick={() => window.confirm(`Suspend ${author.username ?? "this user"}? Their account becomes read-only.`) && act(`/admin/users/${author.id}/suspend`)}
          >
            Suspend author
          </button>
        )}
        <button className="button-secondary-btn" disabled={busy} onClick={() => act(`/admin/comments/${c.id}/dismiss`)}>
          Dismiss reports
        </button>
      </div>
    </li>
  );
}

export function ReportsTab({ onChange }) {
  const { data, error, reload } = useAdminList("/admin/reports");
  const done = () => {
    reload();
    onChange();
  };

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading...</p>;
  if (data.length === 0) return <p className="muted">No open reports.</p>;
  return (
    <ul className="employer-list">
      {data.map((c) => (
        <ReportedComment key={c.id} c={c} onDone={done} />
      ))}
    </ul>
  );
}
