import { useState } from "react";
import { formatDateTime } from "../../lib/formatTime.js";
import { useAdminList, useAdminAction } from "./useAdminApi.js";

function Message({ m, onDone }) {
  const { run, busy, error } = useAdminAction();
  const [reply, setReply] = useState("");

  async function send() {
    if (await run(`/admin/messages/${m.id}/reply`, { reply })) onDone();
  }

  return (
    <li className="employer-card admin-item">
      <p className="program-meta">
        From {m.user.username ?? "(no username)"} ({m.user.email}) · {formatDateTime(m.createdAt)}
        {m.user.suspendedAt && <span className="badge badge-closed admin-inline-badge">suspended</span>}
      </p>
      <h2 className="message-subject">{m.subject}</h2>
      <blockquote className="comment-text admin-quote">{m.body}</blockquote>
      {m.status === "OPEN" ? (
        <>
          {error && <p className="error">{error}</p>}
          <label className="visually-hidden" htmlFor={`reply-${m.id}`}>
            Reply
          </label>
          <textarea
            id={`reply-${m.id}`}
            rows={3}
            maxLength={3000}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply (the sender sees this on My messages)"
          />
          <div className="admin-actions">
            <button disabled={busy || !reply.trim()} onClick={send}>
              Send reply &amp; resolve
            </button>
          </div>
        </>
      ) : (
        <div className="admin-reply">
          <strong>Your reply</strong> <span className="program-meta">{formatDateTime(m.repliedAt)}</span>
          <p className="comment-text">{m.adminReply}</p>
        </div>
      )}
    </li>
  );
}

export function MessagesTab({ onChange }) {
  const [status, setStatus] = useState("OPEN");
  const { data, error, reload } = useAdminList(`/admin/messages?status=${status}`);
  const done = () => {
    reload();
    onChange();
  };

  return (
    <div>
      <div className="filters">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Message status">
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Answered</option>
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="muted">Loading…</p>}
      {data?.length === 0 && <p className="muted">Nothing here.</p>}
      <ul className="employer-list">
        {data?.map((m) => (
          <Message key={m.id} m={m} onDone={done} />
        ))}
      </ul>
    </div>
  );
}
