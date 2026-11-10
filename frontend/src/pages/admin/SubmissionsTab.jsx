import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDateTime } from "../../lib/formatTime.js";
import { useAdminList, useAdminAction } from "./useAdminApi.js";

const STATUSES = ["PENDING", "ACCEPTED", "REJECTED"];

function Submission({ s, onDone }) {
  const { run, busy, error } = useAdminAction();
  const [note, setNote] = useState("");

  async function decide(decision) {
    if (await run(`/admin/submissions/${s.id}/review`, { decision, note })) onDone();
  }

  return (
    <li className="employer-card admin-item">
      <p className="program-meta">
        {s.kind === "LISTING_UPDATE" ? "Listing update" : "New program lead"} · {formatDateTime(s.createdAt)} · from{" "}
        {s.submitter.username ?? "(no username)"} ({s.submitter.email})
      </p>
      {s.program && (
        <p>
          For{" "}
          {s.program.publishStatus === "DRAFT" ? s.program.name : <Link to={`/programs/${s.program.slug}`}>{s.program.name}</Link>}
        </p>
      )}
      <blockquote className="comment-text admin-quote">{s.body}</blockquote>
      {s.sourceUrl && (
        <p className="program-meta">
          Link (a lead, not evidence):{" "}
          <a href={s.sourceUrl} target="_blank" rel="noreferrer noopener">{s.sourceUrl}</a>
        </p>
      )}
      {s.status === "PENDING" ? (
        <>
          {error && <p className="error">{error}</p>}
          <div className="admin-actions">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              placeholder="Note to the submitter (optional, they'll see it)"
              aria-label="Note to the submitter"
            />
            <button disabled={busy} onClick={() => decide("ACCEPTED")}>Accept</button>
            <button className="button-secondary-btn" disabled={busy} onClick={() => decide("REJECTED")}>Reject</button>
          </div>
          <p className="field-hint">Accepting only records the decision. Change the listing via staging → validate → import.</p>
        </>
      ) : (
        s.adminNote && <p className="program-meta">Note: {s.adminNote}</p>
      )}
    </li>
  );
}

export function SubmissionsTab({ onChange }) {
  const [status, setStatus] = useState("PENDING");
  const { data, error, reload } = useAdminList(`/admin/submissions?status=${status}`);
  const done = () => {
    reload();
    onChange();
  };

  return (
    <div>
      <div className="filters">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Submission status">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {!data && !error && <p>Loading...</p>}
      {data?.length === 0 && <p className="muted">Nothing here.</p>}
      <ul className="employer-list">
        {data?.map((s) => (
          <Submission key={s.id} s={s} onDone={done} />
        ))}
      </ul>
    </div>
  );
}
