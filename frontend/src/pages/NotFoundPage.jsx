import { Link } from "react-router-dom";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";

export function NotFoundPage({ what = "page" }) {
  useDocumentTitle("Not found");
  return (
    <div className="empty-state">
      <h1>We couldn't find that {what}</h1>
      <p>It may have been removed, or the link may be mistyped.</p>
      <div className="empty-state-actions">
        <Link to="/programs">Browse all programs</Link>
      </div>
    </div>
  );
}
