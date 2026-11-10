import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { formatDate, FORMAT_LABELS, TECH_TRACK_LABELS, AVAILABILITY_LABELS, REMOTE_LABELS } from "../../lib/programLabels.js";
import { useAdminList, useAdminAction } from "./useAdminApi.js";

// research/IMPORT_AND_MAINTENANCE_PLAN.md → "Human review (the gate)".
const CHECKLIST = [
  "The program is active and the name matches the official page.",
  "The veteran route is stated on the page itself, not inferred.",
  "The format is right, and the description doesn't imply employment from training.",
  "Cost, duration and application status match, or are shown as not stated.",
  "The application URL works.",
  "Each `conflicts` entry for this record in programs-staging.json is resolved or accepted.",
];

const show = (v) => (v === null || v === undefined || v === "" ? <span className="muted">Not stated by provider</span> : v);

function Draft({ d, onDone }) {
  const { run, busy, error } = useAdminAction();
  const [checked, setChecked] = useState(() => CHECKLIST.map(() => false));
  const allChecked = checked.every(Boolean);

  async function publish() {
    if (await run(`/admin/drafts/${d.id}/publish`, { contentHash: d.contentHash })) onDone();
  }

  const fields = [
    ["Organization", d.organization.name],
    ["Format", FORMAT_LABELS[d.format]],
    ["Tech tracks", d.techTracks.map((t) => TECH_TRACK_LABELS[t]).join(", ") || null],
    ["Description", d.description],
    ["Veteran access route", d.veteranAccessRoute],
    ["Eligibility", d.eligibilityNotes],
    ["Prerequisites", d.prerequisites],
    ["Location", [REMOTE_LABELS[d.remoteAvailability], d.locations.join("; ")].filter(Boolean).join(" · ") || null],
    ["Duration", d.duration],
    ["Cost", d.cost],
    ["Application status", AVAILABILITY_LABELS[d.applicationAvailability]],
    ["Application timing", d.applicationTiming],
    ["Application URL", d.applicationUrl && <a key="url" href={d.applicationUrl} target="_blank" rel="noreferrer noopener">{d.applicationUrl}</a>],
    ["SkillBridge note", d.skillbridgeNote],
    ["Verified on", formatDate(d.verifiedOn)],
  ];

  return (
    <li className="employer-card admin-item">
      <h2>{d.name}</h2>
      <p>
        <a href={d.officialSourceUrl} target="_blank" rel="noreferrer noopener" className="program-link">
          Open the official page in your browser <ExternalLink size={14} />
        </a>
      </p>
      <dl className="detail-list">
        {fields.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{show(value)}</dd>
          </div>
        ))}
      </dl>

      {d.awaitingResearch ? (
        <p className="listing-notice">
          Awaiting research: this draft came from old seed data, not verified research. It can't be published from
          here. Verify it in staging, re-import, then review it again.
        </p>
      ) : (
        <>
          <fieldset className="checklist">
            <legend>Review checklist</legend>
            {CHECKLIST.map((item, i) => (
              <label key={item}>
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={() => setChecked((prev) => prev.map((v, j) => (j === i ? !v : v)))}
                />
                {item}
              </label>
            ))}
          </fieldset>
          {error && <p className="error">{error}</p>}
          <div className="admin-actions">
            <button disabled={busy || !allChecked} onClick={publish}>
              Approve &amp; publish
            </button>
            {!allChecked && <span className="field-hint">Tick every item to publish.</span>}
          </div>
          <p className="field-hint">
            Something wrong? Don't publish. Fix it in staging, validate and re-import; the draft updates in place.
          </p>
        </>
      )}
    </li>
  );
}

export function DraftsTab({ onChange }) {
  const { data, error, reload } = useAdminList("/admin/drafts");
  const done = () => {
    reload();
    onChange();
  };

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading...</p>;
  if (data.length === 0) return <p className="muted">No drafts waiting.</p>;
  return (
    <ul className="employer-list">
      {data.map((d) => (
        <Draft key={`${d.id}:${d.contentHash}`} d={d} onDone={done} />
      ))}
    </ul>
  );
}
