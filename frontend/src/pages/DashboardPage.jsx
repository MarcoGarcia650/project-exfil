import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";

const STATUSES = ["RESEARCHING", "APPLIED", "INTERVIEWING", "OFFER", "REJECTED"];

export function DashboardPage() {
  const { token } = useAuth();
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
      <p className="summary">
        {data.summary.totalSaved} saved employers &middot; {data.summary.completedActionItems}/
        {data.summary.totalActionItems} action items complete
      </p>

      <ul className="saved-list">
        {data.savedEmployers.map((se) => (
          <li key={se.id} className="saved-card">
            <h2>{se.employer.name}</h2>
            <p className="program-name">{se.employer.programName}</p>

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
