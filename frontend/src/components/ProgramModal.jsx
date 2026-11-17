import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { X, ArrowRight } from "lucide-react";
import { ProgramSummary } from "./ProgramSummary.jsx";
import { ListingAdminBar } from "../pages/admin/ListingAdminBar.jsx";
import { ListingEditor } from "../pages/admin/ListingEditor.jsx";

// Listing details floating over the browse grid. A native <dialog> opened
// with showModal() gives a focus trap, Escape to close, and a ::backdrop
// (dimmed + blurred in CSS). Clicking the backdrop also closes it.
// Admins get edit/archive/remove/delete tools; Edit swaps the details for
// the edit form inside the same dialog.
//   onAdminChange(outcome) → archive/unarchive/remove/delete happened
//   onEdited(result)       → a save happened (the caller refreshes the data)
export function ProgramModal({ program, saved, onSave, onUnsave, onClose, onAdminChange, onEdited }) {
  const ref = useRef(null);
  const [editing, setEditing] = useState(false);

  // No cleanup that calls close(): it would fire the dialog's "close" event
  // (and navigate) during React's dev double-mount. Unmounting removes the
  // dialog from the page, which also takes it out of the top layer.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function handleClick(e) {
    // A click on the dialog element itself (not its content) is the backdrop.
    // While editing, a stray backdrop click must not throw away the form.
    if (e.target === ref.current && !editing) onClose();
  }

  function handleSaved(result) {
    setEditing(false);
    onEdited?.(result);
  }

  return (
    <dialog
      ref={ref}
      className={editing ? "program-modal is-editing" : "program-modal"}
      aria-labelledby="program-modal-title"
      onCancel={(e) => {
        e.preventDefault();
        if (editing) {
          if (window.confirm("Discard your changes to this listing?")) setEditing(false);
          return;
        }
        onClose();
      }}
      onClick={handleClick}
    >
      <div className="modal-body">
        <button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Close details" autoFocus>
          <X size={18} aria-hidden="true" />
        </button>
        {editing ? (
          <>
            <h2 id="program-modal-title" className="modal-edit-title">
              Edit: {program.name}
            </h2>
            <ListingEditor id={program.id} onSaved={handleSaved} onCancel={() => setEditing(false)} />
          </>
        ) : (
          <>
            <ProgramSummary
              program={program}
              saved={saved}
              onSave={onSave}
              onUnsave={onUnsave}
              Heading="h2"
              headingId="program-modal-title"
            />
            <footer className="modal-footer">
              <span>
                <Link to={`/programs/${program.slug}#discussion-heading`}>Discussion</Link>
                {" · "}
                <Link to={`/suggest?program=${program.slug}`}>Suggest an update</Link>
              </span>
              <Link to={`/programs/${program.slug}`} className="button-secondary">
                Open full page <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </footer>
            {onAdminChange && (
              <ListingAdminBar program={program} onEdit={() => setEditing(true)} onChanged={onAdminChange} />
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
