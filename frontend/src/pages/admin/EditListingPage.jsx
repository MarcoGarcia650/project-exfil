import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useDocumentTitle } from "../../lib/useDocumentTitle.js";
import { useAdminList } from "./useAdminApi.js";
import { ListingEditor } from "./ListingEditor.jsx";

// /admin/listings/:id/edit — admin-only. Used from the admin page's queues
// (drafts, rejected, submissions); public listings are edited in place on
// the browse pages.
export function EditListingPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: listing } = useAdminList(`/admin/listings/${id}`);
  const [saved, setSaved] = useState(null);
  useDocumentTitle(listing ? `Edit · ${listing.name}` : "Edit listing");

  if (user && user.role !== "ADMIN") return <Navigate to="/" replace />;

  if (saved) {
    const isPublic = saved.publishStatus === "PUBLISHED" || saved.publishStatus === "ARCHIVED";
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
          {isPublic && listing && <Link to={`/programs/${listing.slug}`}>View listing</Link>}
          <Link to="/admin?tab=drafts">Drafts to review</Link>
          <button type="button" className="button-secondary-btn" onClick={() => setSaved(null)}>
            Keep editing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="breadcrumb">
        <Link to="/admin">Admin</Link> / Edit listing
      </p>
      <h1>Edit: {listing?.name ?? "listing"}</h1>
      <ListingEditor key={id} id={id} onSaved={setSaved} />
    </div>
  );
}
