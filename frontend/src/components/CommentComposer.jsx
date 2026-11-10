import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";

const MAX = 2000;

// Posts a top-level comment (no parentId) or a reply. Shows what the
// visitor needs to do first if they can't post yet.
// basePath: "/programs/<slug>" or "/organizations/<slug>".
export function CommentComposer({ basePath, parentId = null, onPosted, onCancel, autoFocus = false }) {
  const { token, user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [body, setBody] = useState("");
  const [error, setError] = useState(null);
  const [posting, setPosting] = useState(false);

  if (!isAuthenticated) {
    return (
      <p className="composer-gate">
        <Link to="/login" state={{ from: location }}>Log in</Link> or{" "}
        <Link to="/signup" state={{ from: location }}>sign up</Link> to join the discussion.
      </p>
    );
  }
  if (user?.suspended) {
    return <p className="composer-gate">This account is suspended and can't post.</p>;
  }
  if (user && !user.username) {
    return (
      <p className="composer-gate">
        <Link to="/account/username" state={{ from: location }}>Choose a username</Link> to join the discussion.
      </p>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setPosting(true);
    try {
      const comment = await api.post(`${basePath}/comments`, { body, parentId }, token);
      setBody("");
      onPosted(comment);
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={MAX}
        rows={parentId ? 3 : 4}
        required
        autoFocus={autoFocus}
        placeholder={parentId ? "Write a reply" : "Share what you know about this program"}
        aria-label={parentId ? "Reply" : "Comment"}
      />
      {error && <p className="error">{error}</p>}
      <div className="composer-actions">
        <span className="field-hint">
          {body.length}/{MAX}
        </span>
        {onCancel && (
          <button type="button" className="button-link" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={posting || !body.trim()}>
          {posting ? "Posting..." : parentId ? "Reply" : "Post comment"}
        </button>
      </div>
    </form>
  );
}
