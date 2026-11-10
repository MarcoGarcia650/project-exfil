import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";
import { CommentNode } from "../components/CommentNode.jsx";
import { addReply } from "../lib/commentTree.js";
import { NotFoundPage } from "./NotFoundPage.jsx";

// /comments/:id — a discussion view rooted at one comment, for replies
// deeper than the inline indent cap or beyond the first page of replies.
export function ThreadPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  useDocumentTitle(data ? `Thread · ${data.program.name}` : "Thread");

  useEffect(() => {
    setStatus("loading");
    api
      .get(`/comments/${encodeURIComponent(id)}/thread`)
      .then((d) => {
        setData(d);
        setStatus("ok");
      })
      .catch((err) => {
        if (err.status === 404) setStatus("notFound");
        else {
          setError(err.message);
          setStatus("error");
        }
      });
  }, [id]);

  async function loadMore() {
    try {
      const d = await api.get(`/comments/${encodeURIComponent(id)}/thread?cursor=${encodeURIComponent(data.nextCursor)}`);
      setData((prev) => ({
        ...prev,
        root: { ...prev.root, replies: [...prev.root.replies, ...d.root.replies] },
        nextCursor: d.nextCursor,
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  function handleReplied(parentId, reply) {
    setData((prev) => ({ ...prev, root: addReply([prev.root], parentId, reply)[0] }));
  }

  if (status === "loading") return <p>Loading...</p>;
  if (status === "notFound") return <NotFoundPage what="comment" />;
  if (status === "error") return <p className="error">{error}</p>;

  return (
    <div className="discussion">
      <p className="breadcrumb">
        <Link to={`/programs/${data.program.slug}`}>{data.program.name}</Link> / Thread
      </p>
      {data.root.parentId && (
        <p>
          <Link to={`/comments/${data.root.parentId}`}>↑ View parent comment</Link>
        </p>
      )}
      <ul className="comment-list">
        <CommentNode comment={data.root} depth={0} programSlug={data.program.slug} onReplied={handleReplied} pagedByParent />
      </ul>
      {data.nextCursor && (
        <button type="button" className="button-secondary-btn" onClick={loadMore}>
          Load more replies
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
