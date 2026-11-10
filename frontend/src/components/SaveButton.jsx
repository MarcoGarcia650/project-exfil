import { Link, useLocation } from "react-router-dom";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

// Reading is public; saving needs an account. Logged-out visitors get a
// link to log in that brings them back to the page they were on.
// Archived listings can't be saved (the API returns 409), so no button.
export function SaveButton({ program, saved, onSave }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (program.publishStatus === "ARCHIVED") return null;

  if (!isAuthenticated) {
    return (
      <Link to="/login" state={{ from: location }} className="button-secondary">
        <Bookmark size={16} /> Log in to save
      </Link>
    );
  }

  return (
    <button onClick={() => onSave(program.id)} disabled={saved} className="save-button">
      {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
      {saved ? "Saved" : "Save"}
    </button>
  );
}
