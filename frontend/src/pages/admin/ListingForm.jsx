import { useState } from "react";
import { EMPTY_LISTING, NEW_ORG, today, formToBody } from "./listingFormState.js";
import { TECH_TRACK_LABELS, FORMAT_LABELS, AVAILABILITY_LABELS, REMOTE_LABELS } from "../../lib/programLabels.js";

// Shared by Add listing and Edit listing. Required fields mirror the
// research validator; the confirmation must be ticked on every save.
export function ListingForm({ initial, orgs, lockedOrg, intro, submitLabel, busy, error, onSubmit }) {
  const [form, setForm] = useState(initial);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const toggleTrack = (t) =>
    setForm({ ...form, techTracks: form.techTracks.includes(t) ? form.techTracks.filter((x) => x !== t) : [...form.techTracks, t] });

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(formToBody(form), () => setForm({ ...EMPTY_LISTING, verifiedOn: today() }));
  }

  return (
    <form className="listing-form" onSubmit={handleSubmit}>
      <p className="page-lede">{intro}</p>

      {lockedOrg ? (
        <fieldset>
          <legend>Organization</legend>
          <p className="muted">
            {lockedOrg.name} · URL <code>/programs/{lockedOrg.slug}</code> (the organization and URL can't be changed, so
            shared links keep working)
          </p>
        </fieldset>
      ) : (
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
      )}

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
        {busy ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
