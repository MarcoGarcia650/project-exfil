import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { EmployerBadge } from "./EmployerBadge.jsx";
import { AvailabilityBadge } from "./AvailabilityBadge.jsx";
import { SaveButton } from "./SaveButton.jsx";
import { FORMAT_LABELS, TECH_TRACK_LABELS, REMOTE_LABELS, formatDate } from "../lib/programLabels.js";

export const NOT_STATED = "Not stated by provider";

// The listing's core content, shared by the full page (/programs/:slug)
// and the browse modal. `Heading` is h1 on the page, h2 in the modal.
export function ProgramSummary({ program, saved, onSave, onUnsave, Heading = "h1", headingId }) {
  const archived = program.publishStatus === "ARCHIVED";
  const details = [
    ["Eligibility", program.eligibilityNotes ?? NOT_STATED],
    ["Prerequisites", program.prerequisites ?? NOT_STATED],
    ["Location", [REMOTE_LABELS[program.remoteAvailability], program.locations.join("; ")].filter(Boolean).join(" · ") || NOT_STATED],
    ["Duration", program.duration ?? NOT_STATED],
    ["Cost", program.cost ?? NOT_STATED],
    ["Application timing", program.applicationTiming ?? NOT_STATED],
    ["Last verified", formatDate(program.verifiedOn)],
  ];

  return (
    <div className="program-summary">
      <header className="summary-header">
        <EmployerBadge name={program.organization.name} size="lg" />
        <div className="summary-title">
          <Heading id={headingId}>{program.name}</Heading>
          <Link to={`/organizations/${program.organization.slug}`}>{program.organization.name}</Link>
        </div>
      </header>

      <div className="tag-row">
        {!archived && <AvailabilityBadge value={program.applicationAvailability} />}
        <span className="tag">{FORMAT_LABELS[program.format]}</span>
        {program.techTracks.map((t) => (
          <span key={t} className="tag">
            {TECH_TRACK_LABELS[t]}
          </span>
        ))}
      </div>

      <div className="detail-actions">
        {!archived && program.applicationUrl && (
          <a href={program.applicationUrl} target="_blank" rel="noreferrer" className="button-primary">
            Apply on provider's site <ExternalLink size={15} aria-hidden="true" />
          </a>
        )}
        <SaveButton program={program} saved={saved} onSave={onSave} onUnsave={onUnsave} />
        <a href={program.officialSourceUrl} target="_blank" rel="noreferrer" className="program-link">
          Official program page <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>

      <p className="summary-description">{program.description}</p>

      <section className="veteran-route">
        <h3>How veterans can access it</h3>
        <p>{program.veteranAccessRoute}</p>
      </section>

      <dl className="detail-list">
        {details.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd className={value === NOT_STATED ? "muted" : undefined}>{value}</dd>
          </div>
        ))}
      </dl>

      {program.skillbridgeNote && <p className="program-meta">SkillBridge: {program.skillbridgeNote}</p>}
    </div>
  );
}
