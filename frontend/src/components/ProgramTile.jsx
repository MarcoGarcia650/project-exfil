import { Link, useLocation } from "react-router-dom";
import { Bookmark } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { EmployerBadge } from "./EmployerBadge.jsx";
import { AvailabilityBadge } from "./AvailabilityBadge.jsx";
import { UNSAVE_CONFIRM } from "./SaveButton.jsx";
import { FORMAT_LABELS, REMOTE_LABELS, formatDate } from "../lib/programLabels.js";

// One card in the browse grid. The title is a real link to the listing
// page; on wide screens `onOpen` intercepts a plain click to show the
// modal instead (modifier clicks still open the page/new tab).
export function ProgramTile({ program, saved, onSave, onUnsave, onOpen }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  function handleOpen(e) {
    if (!onOpen || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (window.matchMedia("(max-width: 720px)").matches) return; // phones: go to the page
    e.preventDefault();
    onOpen(program, e.currentTarget);
  }

  function toggleSave() {
    if (!saved) onSave(program.id);
    else if (window.confirm(UNSAVE_CONFIRM)) onUnsave(program.id);
  }

  return (
    <article className={saved ? "tile is-saved" : "tile"}>
      <div className="tile-top">
        <EmployerBadge name={program.organization.name} />
        {isAuthenticated ? (
          <button
            type="button"
            className="icon-button save-toggle"
            onClick={toggleSave}
            aria-pressed={saved}
            aria-label={saved ? `Unsave ${program.name}` : `Save ${program.name}`}
            title={saved ? "Saved: click to remove" : "Save"}
          >
            <Bookmark size={17} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        ) : (
          <Link
            to="/login"
            state={{ from: location }}
            className="icon-button save-toggle"
            aria-label={`Log in to save ${program.name}`}
            title="Log in to save"
          >
            <Bookmark size={17} aria-hidden="true" />
          </Link>
        )}
      </div>
      <h2 className="tile-title">
        <Link to={`/programs/${program.slug}`} onClick={handleOpen} className="card-title-link">
          {program.name}
        </Link>
      </h2>
      <p className="tile-org">{program.organization.name}</p>
      <div className="tag-row">
        <AvailabilityBadge value={program.applicationAvailability} />
        <span className="tag">{FORMAT_LABELS[program.format]}</span>
        {REMOTE_LABELS[program.remoteAvailability] && <span className="tag">{REMOTE_LABELS[program.remoteAvailability]}</span>}
      </div>
      <p className="tile-description">{program.description}</p>
      <p className="tile-meta">Verified {formatDate(program.verifiedOn)}</p>
    </article>
  );
}
