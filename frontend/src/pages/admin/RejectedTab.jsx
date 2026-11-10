import { ExternalLink } from "lucide-react";
import { formatDateTime } from "../../lib/formatTime.js";
import { useAdminList, useAdminAction } from "./useAdminApi.js";

function RejectedItem({ r, onDone }) {
  const { run, busy, error } = useAdminAction();
  return (
    <li className="employer-card admin-item">
      <h2>{r.name}</h2>
      <p className="program-meta">
        {r.organization.name} · rejected {formatDateTime(r.rejectedAt)} ·{" "}
        <a href={r.officialSourceUrl} target="_blank" rel="noreferrer noopener" className="program-link">
          official page <ExternalLink size={12} />
        </a>
      </p>
      <p className="listing-notice">
        <strong>Reason:</strong> {r.rejectionReason}
      </p>
      {error && <p className="error">{error}</p>}
      <div className="admin-actions">
        <button className="button-secondary-btn" disabled={busy} onClick={async () => (await run(`/admin/rejected/${r.id}/restore`)) && onDone()}>
          Return to drafts
        </button>
      </div>
    </li>
  );
}

// Rejected drafts: hidden everywhere. Fixing the record in staging and
// re-importing returns it to Drafts to review automatically; "Return to
// drafts" undoes a mistaken reject without a re-import.
export function RejectedTab({ onChange }) {
  const { data, error, reload } = useAdminList("/admin/rejected");
  const done = () => {
    reload();
    onChange();
  };
  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading...</p>;
  if (data.length === 0) return <p className="muted">No rejected drafts.</p>;
  return (
    <ul className="employer-list">
      {data.map((r) => (
        <RejectedItem key={r.id} r={r} onDone={done} />
      ))}
    </ul>
  );
}
