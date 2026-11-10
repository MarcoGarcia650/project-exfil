import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { formatDateTime } from "../lib/formatTime.js";
import { CommentComposer } from "./CommentComposer.jsx";
import { MAX_INDENT } from "../lib/commentTree.js";


function ReportForm({ commentId, onDone }) {
  const { token } = useAuth();
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/comments/${commentId}/reports`, { reason }, token);
      onDone("Reported. An admin will review it.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="report-form" onSubmit={handleSubmit}>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        rows={2}
        required
        autoFocus
        placeholder="What's wrong with this comment?"
        aria-label="Report reason"
      />
      {error && <p className="error">{error}</p>}
      <div className="composer-actions">
        <button type="button" className="button-link" onClick={() => onDone(null)}>
          Cancel
        </button>
        <button type="submit" disabled={!reason.trim()}>
          Send report
        </button>
      </div>
    </form>
  );
}

// One comment and (up to MAX_INDENT levels of) its replies.
// Bodies render as plain text: React escapes them; never use innerHTML here.
// `pagedByParent`: the thread view pages this node's replies itself, so
// it shouldn't also link to "view all replies" (that would be this page).
export function CommentNode({ comment, depth, programSlug, onReplied, pagedByParent = false }) {
  const { isAuthenticated, user } = useAuth();
  const [mode, setMode] = useState(null); // null | "reply" | "report"
  const [notice, setNotice] = useState(null);

  const isMine = !comment.hidden && user?.username && comment.author.username === user.username;
  const canInteract = isAuthenticated && !comment.hidden && !user?.suspended;
  const showChildren = depth < MAX_INDENT;
  const hiddenReplies = comment.replyCount - (showChildren ? comment.replies.length : 0);

  return (
    <li className="comment">
      <article className={comment.hidden ? "comment-body removed" : "comment-body"}>
        <header className="comment-meta">
          {comment.hidden ? (
            <span>Removed by admin</span>
          ) : (
            <strong>{comment.author.username}</strong>
          )}
          <time dateTime={comment.createdAt}>{formatDateTime(comment.createdAt)}</time>
        </header>
        {!comment.hidden && <p className="comment-text">{comment.body}</p>}

        {canInteract && mode === null && (
          <div className="comment-actions">
            <button type="button" className="button-link" onClick={() => setMode("reply")}>
              Reply
            </button>
            {!isMine && (
              <button type="button" className="button-link" onClick={() => setMode("report")}>
                Report
              </button>
            )}
          </div>
        )}
        {notice && <p className="field-hint">{notice}</p>}
        {mode === "reply" && (
          <CommentComposer
            programSlug={programSlug}
            parentId={comment.id}
            autoFocus
            onCancel={() => setMode(null)}
            onPosted={(reply) => {
              setMode(null);
              onReplied(comment.id, reply);
            }}
          />
        )}
        {mode === "report" && (
          <ReportForm
            commentId={comment.id}
            onDone={(msg) => {
              setMode(null);
              setNotice(msg);
            }}
          />
        )}
      </article>

      {showChildren && comment.replies.length > 0 && (
        <ul className="comment-replies">
          {comment.replies.map((r) => (
            <CommentNode key={r.id} comment={r} depth={depth + 1} programSlug={programSlug} onReplied={onReplied} />
          ))}
        </ul>
      )}
      {hiddenReplies > 0 && !pagedByParent && (
        <Link to={`/comments/${comment.id}`} className="thread-link">
          {showChildren
            ? `View all ${comment.replyCount} replies`
            : `Continue thread (${comment.replyCount} ${comment.replyCount === 1 ? "reply" : "replies"})`}{" "}
          →
        </Link>
      )}
    </li>
  );
}
