import { useEffect, useState } from "react";
import { Pencil, Archive, ArchiveRestore, EyeOff, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { api } from "../../lib/api.js";
import { useAdminAction } from "./useAdminApi.js";

// Admin-only controls on a public listing (browse popup, listing page).
// Renders nothing for everyone else; the server re-checks the role anyway.
//   onEdit()            → the caller swaps in <ListingEditor>
//   onChanged(outcome)  → outcome: "archived" | "unarchived" | "removed" | "deleted"
export function ListingAdminBar({ program, onEdit, onChanged }) {
  const { user, token } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { run, busy, error } = useAdminAction();
  const [archiving, setArchiving] = useState(false);
  const [reason, setReason] = useState("");
  const [usage, setUsage] = useState(null);

  // Whether "Delete permanently" is possible depends on users' data.
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    api
      .get(`/admin/listings/${program.id}/usage`, token)
      .then((u) => !cancelled && setUsage(u))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdmin, program.id, program.publishStatus, token]);

  if (!isAdmin) return null;
  const archived = program.publishStatus === "ARCHIVED";

  async function archive() {
    if (await run(`/admin/listings/${program.id}/archive`, { reason })) {
      setArchiving(false);
      setReason("");
      onChanged("archived");
    }
  }

  async function unarchive() {
    const result = await run(`/admin/listings/${program.id}/unarchive`);
    if (result) onChanged(result.publishStatus === "PUBLISHED" ? "unarchived" : "unarchivedToDraft");
  }

  async function remove() {
    const ok = window.confirm(
      `Remove "${program.name}"?\n\nIt disappears from the site right away. Users who saved it keep it on their dashboard as "no longer available". You can restore it from Admin → Removed.`
    );
    if (ok && (await run(`/admin/listings/${program.id}/remove`))) onChanged("removed");
  }

  async function deletePermanently() {
    const ok = window.confirm(
      `Delete "${program.name}" permanently?\n\nThis can't be undone. If it's still in the research file, the next import brings it back as a draft.`
    );
    if (ok && (await run(`/admin/listings/${program.id}`, {}, "DELETE"))) onChanged("deleted");
  }

  const deleteBlockedReason =
    usage && !usage.canDelete
      ? "Can't delete permanently while users have saved, discussed or suggested changes to it. Remove it instead."
      : null;

  return (
    <div className="admin-bar" role="group" aria-label="Admin tools">
      <span className="admin-bar-label">Admin</span>
      {archiving ? (
        <div className="admin-actions">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            autoFocus
            placeholder="Public note, e.g. Applications closed for good (Nov 2026)."
            aria-label="Why it's archived (shown publicly)"
          />
          <button type="button" className="button-primary" disabled={busy || !reason.trim()} onClick={archive}>
            Archive
          </button>
          <button type="button" className="button-link" onClick={() => setArchiving(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="admin-actions">
          <button type="button" className="button-secondary-btn" onClick={onEdit} disabled={busy}>
            <Pencil size={15} aria-hidden="true" /> Edit
          </button>
          {archived ? (
            <button type="button" className="button-secondary-btn" onClick={unarchive} disabled={busy}>
              <ArchiveRestore size={15} aria-hidden="true" /> Unarchive
            </button>
          ) : (
            <button type="button" className="button-secondary-btn" onClick={() => setArchiving(true)} disabled={busy}>
              <Archive size={15} aria-hidden="true" /> Archive…
            </button>
          )}
          <button type="button" className="button-secondary-btn" onClick={remove} disabled={busy}>
            <EyeOff size={15} aria-hidden="true" /> Remove
          </button>
          <button
            type="button"
            className="button-danger"
            onClick={deletePermanently}
            disabled={busy || !usage?.canDelete}
            title={deleteBlockedReason ?? undefined}
            aria-describedby={deleteBlockedReason ? `delete-note-${program.id}` : undefined}
          >
            <Trash2 size={15} aria-hidden="true" /> Delete permanently
          </button>
        </div>
      )}
      {deleteBlockedReason && !archiving && (
        <p id={`delete-note-${program.id}`} className="admin-bar-note">
          {deleteBlockedReason}
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
