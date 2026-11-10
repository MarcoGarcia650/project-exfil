import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink, Archive } from "lucide-react";
import { api } from "../lib/api.js";
import { useSavedProgramIds } from "../lib/useSavedProgramIds.js";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";
import { EmployerBadge } from "../components/EmployerBadge.jsx";
import { AvailabilityBadge } from "../components/AvailabilityBadge.jsx";
import { SaveButton } from "../components/SaveButton.jsx";
import { NotFoundPage } from "./NotFoundPage.jsx";
import { FORMAT_LABELS, TECH_TRACK_LABELS, REMOTE_LABELS, formatDate } from "../lib/programLabels.js";

const NOT_STATED = "Not stated by provider";

// Shareable listing page at /programs/:slug. Public. The API returns 404
// for DRAFTs and missing slugs alike; ARCHIVED listings render with a banner.
export function ProgramDetailPage() {
  const { slug } = useParams();
  const [program, setProgram] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | notFound | error
  const [error, setError] = useState(null);
  const { savedIds, save, error: saveError } = useSavedProgramIds();
  useDocumentTitle(program?.name);

  useEffect(() => {
    setStatus("loading");
    api
      .get(`/programs/${encodeURIComponent(slug)}`)
      .then((p) => {
        setProgram(p);
        setStatus("ok");
      })
      .catch((err) => {
        // api.js throws Error(message); the 404 body says "Program not found"
        if (/not found/i.test(err.message)) setStatus("notFound");
        else {
          setError(err.message);
          setStatus("error");
        }
      });
  }, [slug]);

  if (status === "loading") return <p>Loading...</p>;
  if (status === "notFound") return <NotFoundPage what="program" />;
  if (status === "error") return <p className="error">{error}</p>;

  const archived = program.publishStatus === "ARCHIVED";
  const details = [
    ["Format", FORMAT_LABELS[program.format]],
    ["Tech tracks", program.techTracks.map((t) => TECH_TRACK_LABELS[t]).join(", ") || NOT_STATED],
    ["Eligibility", program.eligibilityNotes ?? NOT_STATED],
    ["Prerequisites", program.prerequisites ?? NOT_STATED],
    ["Location", [REMOTE_LABELS[program.remoteAvailability], program.locations.join("; ")].filter(Boolean).join(" · ") || NOT_STATED],
    ["Duration", program.duration ?? NOT_STATED],
    ["Cost", program.cost ?? NOT_STATED],
    ["Application timing", program.applicationTiming ?? NOT_STATED],
  ];

  return (
    <article className="program-detail">
      <p className="breadcrumb">
        <Link to="/programs">Programs</Link> / <Link to={`/organizations/${program.organization.slug}`}>{program.organization.name}</Link>
      </p>

      {archived && (
        <div className="archived-banner" role="note">
          <Archive size={18} />
          <div>
            <strong>This listing is no longer active.</strong>
            {program.archiveReason && <p>{program.archiveReason}</p>}
          </div>
        </div>
      )}

      <header className="employer-card-header">
        <EmployerBadge name={program.organization.name} />
        <div>
          <h1>{program.name}</h1>
          <p className="program-name">
            <Link to={`/organizations/${program.organization.slug}`}>{program.organization.name}</Link>
            {" · "}
            {FORMAT_LABELS[program.format]}
          </p>
        </div>
      </header>

      <div className="tag-row">
        {!archived && <AvailabilityBadge value={program.applicationAvailability} />}
        <span className="program-meta">Last verified {formatDate(program.verifiedOn)}</span>
      </div>

      <p>{program.description}</p>

      <section className="veteran-route">
        <h2>How veterans can access it</h2>
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

      <div className="detail-actions">
        {!archived && program.applicationUrl && (
          <a href={program.applicationUrl} target="_blank" rel="noreferrer" className="button-primary">
            Apply on provider's site <ExternalLink size={14} />
          </a>
        )}
        <a href={program.officialSourceUrl} target="_blank" rel="noreferrer" className="program-link">
          Official program page <ExternalLink size={14} />
        </a>
        <SaveButton program={program} saved={savedIds.has(program.id)} onSave={save} />
      </div>
      {saveError && <p className="error">{saveError}</p>}

      <p className="disclaimer">
        Details can change. Confirm eligibility and dates on the provider's official page before applying.
      </p>
    </article>
  );
}
