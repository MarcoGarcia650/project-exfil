import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { api } from "../lib/api.js";
import { useSavedProgramIds } from "../lib/useSavedProgramIds.js";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";
import { EmployerBadge } from "../components/EmployerBadge.jsx";
import { ProgramTile } from "../components/ProgramTile.jsx";
import { NotFoundPage } from "./NotFoundPage.jsx";
import { CommentsSection } from "../components/CommentsSection.jsx";

// /organizations/:slug — public. Active programs, then archived ones
// (linked, so their reasons stay readable). Drafts never appear.
export function OrganizationPage() {
  const { slug } = useParams();
  const [org, setOrg] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const { savedIds, save, unsave, error: saveError } = useSavedProgramIds();
  useDocumentTitle(org?.name);

  useEffect(() => {
    setStatus("loading");
    api
      .get(`/organizations/${encodeURIComponent(slug)}`)
      .then((o) => {
        setOrg(o);
        setStatus("ok");
      })
      .catch((err) => {
        if (err.status === 404) setStatus("notFound");
        else {
          setError(err.message);
          setStatus("error");
        }
      });
  }, [slug]);

  if (status === "loading") return <p>Loading...</p>;
  if (status === "notFound") return <NotFoundPage what="organization" />;
  if (status === "error") return <p className="error">{error}</p>;

  return (
    <div>
      <p className="breadcrumb">
        <Link to="/programs">Programs</Link> / {org.name}
      </p>
      <header className="employer-card-header">
        <EmployerBadge name={org.name} />
        <div>
          <h1>{org.name}</h1>
          {org.websiteUrl && (
            <a href={org.websiteUrl} target="_blank" rel="noreferrer" className="program-link">
              Website <ExternalLink size={14} />
            </a>
          )}
        </div>
      </header>

      <h2 className="section-heading">
        {org.programs.length} active {org.programs.length === 1 ? "program" : "programs"}
      </h2>
      {saveError && <p className="error">{saveError}</p>}
      {org.programs.length === 0 && <p className="muted">No active programs right now.</p>}
      <div className="tile-grid">
        {org.programs.map((p) => (
          <ProgramTile key={p.id} program={{ ...p, organization: { ...org } }} saved={savedIds.has(p.id)} onSave={save} onUnsave={unsave} />
        ))}
      </div>

      {org.archivedPrograms.length > 0 && (
        <>
          <h2 className="section-heading">No longer active</h2>
          <ul className="archived-list">
            {org.archivedPrograms.map((p) => (
              <li key={p.id}>
                <Link to={`/programs/${p.slug}`}>{p.name}</Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <CommentsSection
        basePath={`/organizations/${org.slug}`}
        intro={`General discussion about ${org.name}: hiring, culture, and experiences across its programs. For a specific program, use that listing's discussion.`}
      />
    </div>
  );
}
