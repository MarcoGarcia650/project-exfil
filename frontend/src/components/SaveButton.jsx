import { Link, useLocation } from "react-router-dom";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

// Reading is public; saving needs an account. Logged-out visitors get a
// link to log in that brings them back to the page they were on.
// Archived listings can't be saved (the API returns 409), so no button.
export const UNSAVE_CONFIRM =
  "Remove this program from your saved list? Its status and checklist will be deleted.";

export function SaveButton({ program, saved, onSave, onUnsave }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (program.publishStatus === "ARCHIVED") return null;

  function handleClick() {
    if (!saved) return onSave(program.id);
    if (onUnsave && window.confirm(UNSAVE_CONFIRM)) onUnsave(program.id);
  }

  if (!isAuthenticated) {
    return (
      <Link to="/login" state={{ from: location }} className="button-secondary">
        <Bookmark size={16} /> Log in to save
      </Link>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={saved && !onUnsave}
      aria-pressed={saved}
      title={saved ? "Click to remove from saved" : undefined}
      className={saved ? "save-button is-saved" : "save-button"}
    >
      {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
      {saved ? "Saved" : "Save"}
    </button>
  );
}
