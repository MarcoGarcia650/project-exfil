import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { api } from "../../lib/api.js";
import { formatDateTime } from "../../lib/formatTime.js";
import { useAdminAction } from "./useAdminApi.js";

function UserRow({ u, onUpdated }) {
  const { run, busy, error } = useAdminAction();
  const [link, setLink] = useState(null);
  const suspended = Boolean(u.suspendedAt);

  async function toggleSuspend() {
    const verb = suspended ? "unsuspend" : "suspend";
    if (!suspended && !window.confirm(`Suspend ${u.username ?? u.email}? Their account becomes read-only.`)) return;
    const updated = await run(`/admin/users/${u.id}/${verb}`);
    if (updated) onUpdated(updated);
  }

  async function makeLink() {
    const result = await run(`/admin/users/${u.id}/reset-link`);
    if (result) setLink(result);
  }

  return (
    <li className="employer-card admin-item">
      <p>
        <strong>{u.username ?? "(no username)"}</strong> · {u.email}
        {u.role === "ADMIN" && <span className="badge admin-inline-badge">admin</span>}
        {suspended && <span className="badge badge-closed admin-inline-badge">suspended</span>}
      </p>
      <p className="program-meta">
        Joined {formatDateTime(u.createdAt)} · {u._count.comments} comments · {u._count.reports} reports filed ·{" "}
        {u._count.submissions} submissions
      </p>
      {error && <p className="error">{error}</p>}
      <div className="admin-actions">
        {u.role !== "ADMIN" && (
          <button className={suspended ? "" : "button-danger"} disabled={busy} onClick={toggleSuspend}>
            {suspended ? "Unsuspend" : "Suspend"}
          </button>
        )}
        <button className="button-secondary-btn" disabled={busy} onClick={makeLink}>
          Generate reset link
        </button>
      </div>
      {link && (
        <div className="reset-link-box">
          <p className="field-hint">
            Valid {link.expiresInHours}h, single use, shown once. Send it only through a channel you've confirmed
            belongs to this account's owner.
          </p>
          <input type="text" readOnly value={link.link} onFocus={(e) => e.target.select()} aria-label="Reset link" />
        </div>
      )}
    </li>
  );
}

export function UsersTab() {
  const { token } = useAuth();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);

  async function search(e) {
    e.preventDefault();
    setError(null);
    try {
      setUsers(await api.get(`/admin/users?q=${encodeURIComponent(q)}`, token));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <form className="filters" onSubmit={search}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Username or email"
          aria-label="Find user by username or email"
          minLength={2}
          required
        />
        <button type="submit">Search</button>
      </form>
      {error && <p className="error">{error}</p>}
      {users?.length === 0 && <p className="muted">No users found.</p>}
      <ul className="employer-list">
        {users?.map((u) => (
          <UserRow key={u.id} u={u} onUpdated={(nu) => setUsers((prev) => prev.map((x) => (x.id === nu.id ? nu : x)))} />
        ))}
      </ul>
    </div>
  );
}
