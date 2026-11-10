import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useDocumentTitle } from "../../lib/useDocumentTitle.js";
import { useAdminList, useAdminAction } from "./useAdminApi.js";
import { ListingForm } from "./ListingForm.jsx";
import { listingToForm } from "./listingFormState.js";

const STATUS_NOTE = {
  PUBLISHED: "This listing is live. Saving updates it immediately, and your edit counts as the review.",
  DRAFT: "This listing is a draft. Saving keeps it a draft; publish it from Drafts to review.",
  ARCHIVED: "This listing is archived. Saving keeps it archived.",
  REJECTED: "This listing was rejected. Saving moves it back to Drafts to review.",
};

// /admin/listings/:id/edit — admin-only.
export function EditListingPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: listing, error: loadError } = useAdminList(`/admin/listings/${id}`);
  const { run, busy, error } = useAdminAction();
  const [saved, setSaved] = useState(null);
  useDocumentTitle(listing ? `Edit · ${listing.name}` : "Edit listing");

  if (user && user.role !== "ADMIN") return <Navigate to="/" replace />;
  if (loadError) return <p className="error">{loadError}</p>;
  if (!listing) return <p className="muted">Loading…</p>;

  const publicPath = `/programs/${listing.slug}`;
  const isPublic = listing.publishStatus === "PUBLISHED" || listing.publishStatus === "ARCHIVED";

  if (saved) {
    return (
      <div className="empty-state">
        <h1>{saved.changed ? "Listing updated" : "No changes to save"}</h1>
        {saved.changed && <p>Status: {saved.publishStatus.toLowerCase()}. Future imports won't overwrite this edit.</p>}
        {saved.warnings?.map((w) => (
          <p key={w} className="listing-notice">
            {w}
          </p>
        ))}
        <div className="empty-state-actions">
          {isPublic && <Link to={publicPath}>View listing</Link>}
          <Link to="/admin?tab=drafts">Drafts to review</Link>
          <button type="button" className="button-secondary-btn" onClick={() => setSaved(null)}>
            Keep editing
          </button>
        </div>
      </div>
    );
  }

  async function submit(body) {
    const result = await run(`/admin/listings/${id}`, body, "PUT");
    if (result) setSaved(result);
  }

  return (
    <div>
      <p className="breadcrumb">
        <Link to="/admin">Admin</Link> / Edit listing
      </p>
      <h1>Edit: {listing.name}</h1>
      <p className="listing-notice">{STATUS_NOTE[listing.publishStatus]}</p>
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
    </div>
  );
}
