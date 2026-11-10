import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { UserRound } from "lucide-react";
import { isPublicStatus } from "../lib/publishStatus.js";
import { UNSAVE_CONFIRM } from "../components/SaveButton.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { EmployerBadge } from "../components/EmployerBadge.jsx";

const STATUSES = ["RESEARCHING", "APPLIED", "INTERVIEWING", "OFFER", "REJECTED"];

export function DashboardPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadDashboard() {
    api
      .get("/dashboard", token)
      .then(setData)
      .catch((err) => setError(err.message));
  }

  async function handleStatusChange(savedEmployerId, status) {
    try {
      await api.patch(`/saved-employers/${savedEmployerId}`, { status }, token);
      loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(programId) {
    if (!window.confirm(UNSAVE_CONFIRM)) return;
    try {
      await api.delete(`/saved-employers/program/${programId}`, token);
      loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleActionItem(actionItemId, completed) {
    try {
      await api.patch(`/action-items/${actionItemId}`, { completed: !completed }, token);
      loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <h1>Dashboard</h1>
      {user?.suspended && (
        <p className="listing-notice">This account is suspended and is read-only.</p>
      )}
      {user && !user.username && !user.suspended && (
        <p className="prompt-banner">
          <UserRound size={18} />
          <span>
            Pick a username so you're ready to join discussions. <Link to="/account/username">Choose one</Link>
          </span>
        </p>
      )}
      <p className="dashboard-links">
        <Link to="/account/submissions">My submissions</Link>
      </p>
      <p className="summary">
        {data.summary.totalSaved} saved programs &middot; {data.summary.completedActionItems}/
        {data.summary.totalActionItems} action items complete
      </p>

      <ul className="saved-list">
        {data.savedPrograms.map((se) => (
          <li key={se.id} className="saved-card">
            <div className="employer-card-header">
              <EmployerBadge name={se.program.organization.name} />
              <div>
                <h2>
                  {/* Non-public listings (draft, rejected) have no page; only link public ones. */}
                  {!isPublicStatus(se.program.publishStatus) ? (
                    se.program.name
                  ) : (
                    <Link to={`/programs/${se.program.slug}`} className="card-title-link">
                      {se.program.name}
                    </Link>
                  )}
                </h2>
                <p className="program-name">{se.program.organization.name}</p>
              </div>
            </div>

            {/* Listing state comes from the server: drafts expose no content,
                archived listings always carry a user-facing reason. */}
            {se.program.publishStatus === "DRAFT" && (
              <p className="listing-notice">Under review: this listing is being re-verified.</p>
            )}
            {se.program.publishStatus === "REJECTED" && (
              <p className="listing-notice">This listing isn't available right now.</p>
            )}
            {se.program.publishStatus === "ARCHIVED" && (
              <p className="listing-notice">
                {/* Reasons are written as full sentences ("Archived Nov 2026: …"),
                    so a separate "Archived." label would repeat them. */}
                {se.program.archiveReason || "This listing is no longer active."}
              </p>
            )}

            <div className="saved-card-controls">
            <label className="status-label">
              Status
              <select value={se.status} onChange={(e) => handleStatusChange(se.id, e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="button-link" onClick={() => handleRemove(se.program.id)}>
              Remove
            </button>
            </div>

            <ul className="action-items">
              {se.actionItems.map((item) => (
                <li key={item.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleActionItem(item.id, item.completed)}
                    />
                    {item.title}
                  </label>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
