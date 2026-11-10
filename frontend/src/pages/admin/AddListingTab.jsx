import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAdminList, useAdminAction } from "./useAdminApi.js";
import { TECH_TRACK_LABELS, FORMAT_LABELS, AVAILABILITY_LABELS, REMOTE_LABELS } from "../../lib/programLabels.js";

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = {
  organizationSlug: "",
  newOrgName: "",
  newOrgWebsite: "",
  name: "",
  format: "TRAINING",
  techTracks: [],
  description: "",
  veteranAccessRoute: "",
  officialSourceUrl: "",
  applicationUrl: "",
  applicationAvailability: "UNKNOWN",
  applicationTiming: "",
  eligibilityNotes: "",
  prerequisites: "",
  remoteAvailability: "",
  locations: "",
  duration: "",
  cost: "",
  skillbridgeNote: "",
  verifiedOn: today(),
  confirmVeteranRoute: false,
};
const NEW_ORG = "__new__";

// Admin "Add listing": creates a DRAFT that goes through Drafts to review
// like imported listings. Required fields mirror the research validator.
export function AddListingTab({ onChange }) {
  const { data: orgs } = useAdminList("/admin/organizations");
  const { run, busy, error } = useAdminAction();
  const [, setParams] = useSearchParams();
  const [form, setForm] = useState(EMPTY);
  const [created, setCreated] = useState(null);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const toggleTrack = (t) =>
    setForm({ ...form, techTracks: form.techTracks.includes(t) ? form.techTracks.filter((x) => x !== t) : [...form.techTracks, t] });

  async function submit(e) {
    e.preventDefault();
    const isNew = form.organizationSlug === NEW_ORG;
    const body = {
      ...form,
      organizationSlug: isNew ? undefined : form.organizationSlug,
      newOrganization: isNew ? { name: form.newOrgName, websiteUrl: form.newOrgWebsite } : undefined,
      locations: form.locations.split(";").map((l) => l.trim()).filter(Boolean),
    };
    const result = await run("/admin/listings", body);
    if (result) {
      setCreated(result);
      setForm({ ...EMPTY, verifiedOn: today() });
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
    <form className="listing-form" onSubmit={submit}>
      <p className="page-lede">
        New listings are saved as drafts and only go live after Approve &amp; publish. Leave optional fields blank when
        the official page doesn't say; they show as "Not stated by provider".
      </p>

      <fieldset>
        <legend>Organization</legend>
        <label>
          Organization *
          <select value={form.organizationSlug} onChange={set("organizationSlug")} required>
            <option value="">Choose…</option>
            {orgs?.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.name}
              </option>
            ))}
            <option value={NEW_ORG}>+ New organization</option>
          </select>
        </label>
        {form.organizationSlug === NEW_ORG && (
          <div className="form-row">
            <label>
              Organization name *
              <input value={form.newOrgName} onChange={set("newOrgName")} maxLength={120} required />
            </label>
            <label>
              Website (https)
              <input type="url" value={form.newOrgWebsite} onChange={set("newOrgWebsite")} placeholder="https://" />
            </label>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>Program</legend>
        <label>
          Program name *
          <input value={form.name} onChange={set("name")} maxLength={200} required />
        </label>
        <div className="form-row">
          <label>
            Format *
            <select value={form.format} onChange={set("format")}>
              {Object.entries(FORMAT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Application status
            <select value={form.applicationAvailability} onChange={set("applicationAvailability")}>
              {Object.entries(AVAILABILITY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="check-group" role="group" aria-label="Tech tracks (at least one)">
          <span className="form-label">Tech tracks * (at least one)</span>
          {Object.entries(TECH_TRACK_LABELS).map(([v, l]) => (
            <label key={v} className="check">
              <input type="checkbox" checked={form.techTracks.includes(v)} onChange={() => toggleTrack(v)} /> {l}
            </label>
          ))}
        </div>
        <label>
          Description *
          <textarea rows={4} value={form.description} onChange={set("description")} maxLength={2000} required />
        </label>
        <label>
          How veterans can access it *
          <textarea rows={3} value={form.veteranAccessRoute} onChange={set("veteranAccessRoute")} maxLength={1000} required />
          <span className="field-hint">The route for veterans who have already separated, as stated on the official page.</span>
        </label>
      </fieldset>

      <fieldset>
        <legend>Links</legend>
        <div className="form-row">
          <label>
            Official program page * (https)
            <input type="url" value={form.officialSourceUrl} onChange={set("officialSourceUrl")} placeholder="https://" required />
          </label>
          <label>
            Application link (https)
            <input type="url" value={form.applicationUrl} onChange={set("applicationUrl")} placeholder="https://" />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Details (optional)</legend>
        <div className="form-row">
          <label>
            Eligibility
            <textarea rows={2} value={form.eligibilityNotes} onChange={set("eligibilityNotes")} maxLength={1000} />
          </label>
          <label>
            Prerequisites
            <textarea rows={2} value={form.prerequisites} onChange={set("prerequisites")} maxLength={1000} />
          </label>
        </div>
        <div className="form-row">
          <label>
            Location type
            <select value={form.remoteAvailability} onChange={set("remoteAvailability")}>
              <option value="">Not stated</option>
              {Object.entries(REMOTE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Locations (separate with ;)
            <input value={form.locations} onChange={set("locations")} placeholder="Seattle, WA; Remote (US)" />
          </label>
        </div>
        <div className="form-row">
          <label>
            Duration
            <input value={form.duration} onChange={set("duration")} maxLength={1000} />
          </label>
          <label>
            Cost
            <input value={form.cost} onChange={set("cost")} maxLength={1000} />
          </label>
        </div>
        <div className="form-row">
          <label>
            Application timing
            <input value={form.applicationTiming} onChange={set("applicationTiming")} maxLength={1000} />
          </label>
          <label>
            SkillBridge note
            <input value={form.skillbridgeNote} onChange={set("skillbridgeNote")} maxLength={1000} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Verification</legend>
        <label className="narrow">
          Last verified *
          <input type="date" value={form.verifiedOn} max={today()} onChange={set("verifiedOn")} required />
        </label>
        <label className="check confirm">
          <input type="checkbox" checked={form.confirmVeteranRoute} onChange={set("confirmVeteranRoute")} />I read the
          official page, and it states how veterans who have already separated can access this program.
        </label>
      </fieldset>

      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy || !form.confirmVeteranRoute || !form.techTracks.length}>
        {busy ? "Saving…" : "Save as draft"}
      </button>
    </form>
  );
}
