import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useAdminAction } from "./useAdminApi.js";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Admin-only tools on an organization page. `admin` is the admin view of
// the organization (GET /admin/organizations/:slug): id, name, websiteUrl,
// totalListings, comments, canDelete.
//   onSaved()   → name/website changed (the caller reloads)
//   onDeleted() → the organization is gone
export function OrganizationAdminBar({ admin, onSaved, onDeleted }) {
  const { run, busy, error } = useAdminAction();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(admin.name);
  const [websiteUrl, setWebsiteUrl] = useState(admin.websiteUrl ?? "");

  async function save(e) {
    e.preventDefault();
    if (await run(`/admin/organizations/${admin.id}`, { name, websiteUrl }, "PUT")) {
      setEditing(false);
      onSaved();
    }
  }

  async function remove() {
    if (!window.confirm(`Delete the organization "${admin.name}" permanently? This can't be undone.`)) return;
    if (await run(`/admin/organizations/${admin.id}`, {}, "DELETE")) onDeleted();
  }

  const blockers = [
    admin.totalListings > 0 && plural(admin.totalListings, "listing", "listings"),
    admin.comments > 0 && plural(admin.comments, "discussion post", "discussion posts"),
  ].filter(Boolean);

  return (
    <div className="admin-bar" role="group" aria-label="Admin tools">
      <span className="admin-bar-label">Admin</span>
      {editing ? (
        <form className="org-edit-form" onSubmit={save}>
          <label>
            Name *
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
          </label>
          <label>
            Website (https://)
            <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} maxLength={500} placeholder="https://" />
          </label>
          <p className="admin-bar-note">The page's link (/organizations/…) stays the same. Future imports keep your edit.</p>
          <div className="admin-actions">
            <button type="submit" className="button-primary" disabled={busy || !name.trim()}>
              Save organization
            </button>
            <button
              type="button"
              className="button-link"
              onClick={() => {
                setEditing(false);
                setName(admin.name);
                setWebsiteUrl(admin.websiteUrl ?? "");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="admin-actions">
            <button type="button" className="button-secondary-btn" onClick={() => setEditing(true)} disabled={busy}>
              <Pencil size={15} aria-hidden="true" /> Edit organization
            </button>
            <button
              type="button"
              className="button-danger"
              onClick={remove}
              disabled={busy || !admin.canDelete}
              aria-describedby={admin.canDelete ? undefined : "org-delete-note"}
            >
              <Trash2 size={15} aria-hidden="true" /> Delete organization
            </button>
          </div>
          {!admin.canDelete && (
            <p id="org-delete-note" className="admin-bar-note">
              Can be deleted once it has no listings and no discussion (now: {blockers.join(", ")}, counting drafts and
              removed listings).
            </p>
          )}
        </>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
