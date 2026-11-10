import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAdminList, useAdminAction } from "./useAdminApi.js";
import { ListingForm } from "./ListingForm.jsx";
import { EMPTY_LISTING, today } from "./listingFormState.js";

// Admin "Add listing": creates a DRAFT that goes through Drafts to review
// like imported listings.
export function AddListingTab({ onChange }) {
  const { data: orgs } = useAdminList("/admin/organizations");
  const { run, busy, error } = useAdminAction();
  const [, setParams] = useSearchParams();
  const [created, setCreated] = useState(null);
  const [formKey, setFormKey] = useState(0);

  async function submit(body) {
    const result = await run("/admin/listings", body);
    if (result) {
      setCreated(result);
      setFormKey((k) => k + 1);
      onChange();
    }
  }

  if (created) {
    return (
      <div className="empty-state">
        <h2>Draft created</h2>
        <p>
          <code>{created.slug}</code> is hidden until you approve it in Drafts to review.
        </p>
        {created.warnings?.map((w) => (
          <p key={w} className="listing-notice">
            {w}
          </p>
        ))}
        <div className="empty-state-actions">
          <button type="button" onClick={() => setParams({ tab: "drafts" }, { replace: true })}>
            Go to Drafts to review
          </button>
          <button type="button" className="button-secondary-btn" onClick={() => setCreated(null)}>
            Add another
          </button>
        </div>
      </div>
    );
  }

  return (
    <ListingForm
      key={formKey}
      initial={{ ...EMPTY_LISTING, verifiedOn: today() }}
      orgs={orgs}
      intro={'New listings are saved as drafts and only go live after Approve & publish. Leave optional fields blank when the official page doesn\'t say; they show as "Not stated by provider".'}
      submitLabel="Save as draft"
      busy={busy}
      error={error}
      onSubmit={submit}
    />
  );
}
