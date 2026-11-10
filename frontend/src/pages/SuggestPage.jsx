import { Link } from "react-router-dom";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";

// Placeholder until submissions ship in phase 4. The empty state links
// here so that path is stable; the form replaces this page.
export function SuggestPage() {
  useDocumentTitle("Suggest a program");
  return (
    <div className="empty-state">
      <h1>Suggest a program</h1>
      <p>
        Program suggestions are coming soon. Every listing is checked against the provider's official
        page before it's published, so suggestions will be reviewed rather than posted directly.
      </p>
      <div className="empty-state-actions">
        <Link to="/programs">Back to programs</Link>
      </div>
    </div>
  );
}
