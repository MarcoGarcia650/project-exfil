import { Link } from "react-router-dom";
import { formatDateTime } from "../../lib/formatTime.js";
import { useAdminList, useAdminAction } from "./useAdminApi.js";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function usageText({ saves, comments, submissions }) {
  const parts = [
    saves && `saved by ${plural(saves, "user", "users")}`,
    comments && plural(comments, "discussion post", "discussion posts"),
    submissions && plural(submissions, "user suggestion", "user suggestions"),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No saves, discussion or suggestions";
}

function RemovedItem({ r, onDone }) {
  const { run, busy, error } = useAdminAction();

  async function restore() {
    if (await run(`/admin/removed/${r.id}/restore`)) onDone();
  }

  async function deletePermanently() {
    const ok = window.confirm(
      `Delete "${r.name}" permanently?\n\nThis can't be undone. If it's still in the research file, the next import brings it back as a draft.`
    );
    if (ok && (await run(`/admin/listings/${r.id}`, {}, "DELETE"))) onDone();
  }

  return (
    <li className="employer-card admin-item">
      <h2>{r.name}</h2>
      <p className="program-meta">
        <Link to={`/organizations/${r.organization.slug}`}>{r.organization.name}</Link> · removed {formatDateTime(r.removedAt)} · was{" "}
        {(r.removedFromStatus ?? "draft").toLowerCase()}
      </p>
      <p className="muted">{usageText(r.usage)}</p>
      {error && <p className="error">{error}</p>}
      <div className="admin-actions">
        <button className="button-secondary-btn" disabled={busy} onClick={restore}>
          Restore
        </button>
        <Link to={`/admin/listings/${r.id}/edit`} className="button-secondary">
          Edit
        </Link>
        <button
          className="button-danger"
          disabled={busy || !r.canDelete}
          onClick={deletePermanently}
          title={r.canDelete ? undefined : "Users have saved, discussed or suggested changes to it, so it can only stay removed."}
        >
          Delete permanently
        </button>
      </div>
    </li>
  );
}

// Listings an admin removed from the site. Restore puts each back the way
// it was (a published listing edited while removed goes to Drafts to
// review). Delete permanently only works when no user data hangs off it.
export function RemovedTab({ onChange }) {
  const { data, error, reload } = useAdminList("/admin/removed");
  const done = () => {
    reload();
    onChange();
  };
  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading...</p>;
  if (data.length === 0) return <p className="muted">No removed listings.</p>;
  return (
    <ul className="employer-list">
      {data.map((r) => (
        <RemovedItem key={r.id} r={r} onDone={done} />
      ))}
    </ul>
  );
}
