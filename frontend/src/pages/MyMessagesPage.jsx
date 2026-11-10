import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";
import { formatDateTime } from "../lib/formatTime.js";

// /account/messages — the user's messages to the admin and any replies.
export function MyMessagesPage() {
  useDocumentTitle("My messages");
  const { token } = useAuth();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/contact/mine", token).then(setRows).catch((err) => setError(err.message));
  }, [token]);

  if (error) return <p className="error">{error}</p>;
  if (!rows) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h1>My messages</h1>
      <p className="page-lede">
        Your messages to the admin. <Link to="/contact">Send a new message</Link>
      </p>
      {rows.length === 0 && <p className="muted">You haven't sent any messages yet.</p>}
      <ul className="employer-list">
        {rows.map((m) => (
          <li key={m.id} className="employer-card">
            <div className="tag-row">
              <span className={m.status === "RESOLVED" ? "badge badge-sub-accepted" : "badge"}>
                {m.status === "RESOLVED" ? "Answered" : "Waiting for a reply"}
              </span>
              <span className="program-meta">Sent {formatDateTime(m.createdAt)}</span>
            </div>
            <h2 className="message-subject">{m.subject}</h2>
            <p className="comment-text">{m.body}</p>
            {m.adminReply && (
              <div className="admin-reply">
                <strong>Admin reply</strong> <span className="program-meta">{formatDateTime(m.repliedAt)}</span>
                <p className="comment-text">{m.adminReply}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
