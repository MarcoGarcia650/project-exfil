import { useAdminList, useAdminAction } from "./useAdminApi.js";
import { ListingForm } from "./ListingForm.jsx";
import { listingToForm } from "./listingFormState.js";

const EDIT_STATUS_NOTE = {
  PUBLISHED: "This listing is live. Saving updates it immediately, and your edit counts as the review.",
  DRAFT: "This listing is a draft. Saving keeps it a draft; publish it from Drafts to review.",
  ARCHIVED: "This listing is archived. Saving keeps it archived.",
  REJECTED: "This listing was rejected. Saving moves it back to Drafts to review.",
  REMOVED: "This listing is removed. Saving keeps it removed; restore it from Admin → Removed.",
};

// The listing edit form, in place (browse popup, listing page) or on the
// full edit page. Loads the admin copy, saves with PUT, then onSaved(result)
// where result is { changed, publishStatus, warnings }.
export function ListingEditor({ id, onSaved, onCancel }) {
  const { data: listing, error: loadError } = useAdminList(`/admin/listings/${id}`);
  const { run, busy, error } = useAdminAction();

  if (loadError) return <p className="error">{loadError}</p>;
  if (!listing) return <p className="muted">Loading…</p>;

  async function submit(body) {
    const result = await run(`/admin/listings/${id}`, body, "PUT");
    if (result) onSaved(result);
  }

  return (
    <div className="listing-editor">
      <p className="listing-notice">{EDIT_STATUS_NOTE[listing.publishStatus]}</p>
      {listing.rejectionReason && (
        <p className="listing-notice">
          <strong>Rejected because:</strong> {listing.rejectionReason}
        </p>
      )}
      <ListingForm
        initial={listingToForm(listing)}
        lockedOrg={{ name: listing.organization.name, slug: listing.slug }}
        intro="Edits made here are kept by future imports (the research file won't overwrite them)."
        submitLabel="Save changes"
        busy={busy}
        error={error}
        onSubmit={submit}
      />
      {onCancel && (
        <button type="button" className="button-link" onClick={onCancel}>
          Cancel editing
        </button>
      )}
    </div>
  );
}
