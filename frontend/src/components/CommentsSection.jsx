import { useState, useEffect } from "react";
import { api } from "../lib/api.js";
import { CommentNode } from "./CommentNode.jsx";
import { addReply } from "../lib/commentTree.js";
import { CommentComposer } from "./CommentComposer.jsx";

// Public discussion under a listing. Top-level comments oldest-first,
// 20 at a time.
export function CommentsSection({ programSlug }) {
  const [comments, setComments] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/programs/${programSlug}/comments`)
      .then((d) => {
        setComments(d.comments);
        setNextCursor(d.nextCursor);
        setTotal(d.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [programSlug]);

  async function loadMore() {
    try {
      const d = await api.get(`/programs/${programSlug}/comments?cursor=${encodeURIComponent(nextCursor)}`);
      setComments((prev) => [...prev, ...d.comments]);
      setNextCursor(d.nextCursor);
    } catch (err) {
      setError(err.message);
    }
  }

  function handlePosted(comment) {
    setTotal((t) => t + 1);
    // Oldest-first: a new comment belongs at the very end. Only show it
    // inline once every earlier page is loaded, so the order stays true.
    if (nextCursor) setNotice("Posted. Your comment is at the end of the discussion.");
    else setComments((prev) => [...prev, comment]);
  }

  function handleReplied(parentId, reply) {
    setTotal((t) => t + 1);
    setComments((prev) => addReply(prev, parentId, reply));
  }

  return (
    <section className="discussion" aria-labelledby="discussion-heading">
      <h2 id="discussion-heading">Discussion {total > 0 && <span className="muted">({total})</span>}</h2>
      <p className="field-hint">
        Share experiences and questions. Posts are public under your username; be respectful.
      </p>
      {error && <p className="error">{error}</p>}
      {loading && <p>Loading discussion...</p>}
      {!loading && comments.length === 0 && !error && <p className="muted">No comments yet. Start the discussion.</p>}

      <ul className="comment-list">
        {comments.map((c) => (
          <CommentNode key={c.id} comment={c} depth={0} programSlug={programSlug} onReplied={handleReplied} />
        ))}
      </ul>
      {nextCursor && (
        <button type="button" className="button-secondary-btn" onClick={loadMore}>
          Load more comments
        </button>
      )}

      {notice && <p className="success">{notice}</p>}
      <CommentComposer programSlug={programSlug} onPosted={handlePosted} />
    </section>
  );
}
