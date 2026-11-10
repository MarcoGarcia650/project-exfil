import { Link } from "react-router-dom";
import { EmployerBadge } from "./EmployerBadge.jsx";
import { AvailabilityBadge } from "./AvailabilityBadge.jsx";
import { SaveButton } from "./SaveButton.jsx";
import { FORMAT_LABELS, TECH_TRACK_LABELS, formatDate } from "../lib/programLabels.js";

// One listing in a result list (browse and organization pages).
// `showOrg` is off on an organization's own page, where it's redundant.
export function ProgramCard({ program, saved, onSave, showOrg = true }) {
  return (
    <li className="employer-card">
      <div className="employer-card-header">
        {showOrg && <EmployerBadge name={program.organization.name} />}
        <div>
          <h2>
            <Link to={`/programs/${program.slug}`} className="card-title-link">
              {program.name}
            </Link>
          </h2>
          <p className="program-name">
            {showOrg && (
              <>
                <Link to={`/organizations/${program.organization.slug}`}>{program.organization.name}</Link>
                {" · "}
              </>
            )}
            {FORMAT_LABELS[program.format]}
          </p>
        </div>
      </div>
      <p className="card-description">{program.description}</p>
      <div className="tag-row">
        <AvailabilityBadge value={program.applicationAvailability} />
        {program.techTracks.map((t) => (
          <span key={t} className="tag">
            {TECH_TRACK_LABELS[t]}
          </span>
        ))}
      </div>
      <div className="card-footer">
        <span className="program-meta">Last verified {formatDate(program.verifiedOn)}</span>
        <SaveButton program={program} saved={saved} onSave={onSave} />
      </div>
    </li>
  );
}
