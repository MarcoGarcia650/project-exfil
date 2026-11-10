import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { X, ArrowRight } from "lucide-react";
import { ProgramSummary } from "./ProgramSummary.jsx";

// Listing details floating over the browse grid. A native <dialog> opened
// with showModal() gives a focus trap, Escape to close, and a ::backdrop
// (dimmed + blurred in CSS). Clicking the backdrop also closes it.
export function ProgramModal({ program, saved, onSave, onUnsave, onClose }) {
  const ref = useRef(null);

  // No cleanup that calls close(): it would fire the dialog's "close" event
  // (and navigate) during React's dev double-mount. Unmounting removes the
  // dialog from the page, which also takes it out of the top layer.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function handleClick(e) {
    // A click on the dialog element itself (not its content) is the backdrop.
    if (e.target === ref.current) onClose();
  }

  return (
    <dialog
      ref={ref}
      className="program-modal"
      aria-labelledby="program-modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={handleClick}
    >
      <div className="modal-body">
        <button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Close details" autoFocus>
          <X size={18} aria-hidden="true" />
        </button>
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
      </div>
    </dialog>
  );
}
