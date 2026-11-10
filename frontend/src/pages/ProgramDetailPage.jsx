import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Archive } from "lucide-react";
import { api } from "../lib/api.js";
import { useSavedProgramIds } from "../lib/useSavedProgramIds.js";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";
import { NotFoundPage } from "./NotFoundPage.jsx";
import { CommentsSection } from "../components/CommentsSection.jsx";
import { ProgramSummary } from "../components/ProgramSummary.jsx";
import { useAuth } from "../context/AuthContext.jsx";

// Shareable listing page at /programs/:slug. Public. The API returns 404
// for DRAFTs and missing slugs alike; ARCHIVED listings render with a banner.
export function ProgramDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [program, setProgram] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | notFound | error
  const [error, setError] = useState(null);
  const { savedIds, save, unsave, error: saveError } = useSavedProgramIds();
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
        if (err.status === 404) setStatus("notFound");
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

  return (
    <article className="program-detail">
      <div className="breadcrumb-row">
        <p className="breadcrumb">
          <Link to="/programs">Programs</Link> / <Link to={`/organizations/${program.organization.slug}`}>{program.organization.name}</Link>
        </p>
        {user?.role === "ADMIN" && (
          <Link to={`/admin/listings/${program.id}/edit`} className="button-secondary">
            Edit listing
          </Link>
        )}
      </div>

      {archived && (
        <div className="archived-banner" role="note">
          <Archive size={18} aria-hidden="true" />
          <div>
            <strong>This listing is no longer active.</strong>
            {program.archiveReason && <p>{program.archiveReason}</p>}
          </div>
        </div>
      )}

      <div className="detail-card">
        <ProgramSummary program={program} saved={savedIds.has(program.id)} onSave={save} onUnsave={unsave} />
        {saveError && <p className="error">{saveError}</p>}
        <p className="disclaimer">
          Details can change. Confirm eligibility and dates on the provider's official page before applying.{" "}
          <Link to={`/suggest?program=${program.slug}`}>Suggest an update</Link>
        </p>
      </div>

      <CommentsSection basePath={`/programs/${program.slug}`} />
    </article>
  );
}
