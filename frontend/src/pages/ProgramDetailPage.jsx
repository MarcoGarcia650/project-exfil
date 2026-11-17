import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Archive } from "lucide-react";
import { api } from "../lib/api.js";
import { useSavedProgramIds } from "../lib/useSavedProgramIds.js";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";
import { NotFoundPage } from "./NotFoundPage.jsx";
import { CommentsSection } from "../components/CommentsSection.jsx";
import { ProgramSummary } from "../components/ProgramSummary.jsx";
import { ListingAdminBar } from "./admin/ListingAdminBar.jsx";
import { ListingEditor } from "./admin/ListingEditor.jsx";
import { adminNotice } from "../lib/adminNotice.js";

// Shareable listing page at /programs/:slug. Public. The API returns 404
// for DRAFTs and missing slugs alike; ARCHIVED listings render with a banner.
// Admins get edit/archive/remove/delete tools above the listing.
export function ProgramDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [program, setProgram] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | notFound | error
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState(null);
  const { savedIds, save, unsave, error: saveError } = useSavedProgramIds();
  useDocumentTitle(program?.name);

  const load = useCallback(
    () =>
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
        }),
    [slug]
  );

  useEffect(() => {
    setStatus("loading");
    setEditing(false);
    setNotice(null);
    load();
  }, [load]);

  function handleAdminChange(outcome) {
    // Removed, deleted or sent back to drafts: nothing public left at this
    // URL, so go back to browse with the confirmation.
    if (outcome === "removed" || outcome === "deleted" || outcome === "unarchivedToDraft") {
      navigate("/programs", { state: { notice: adminNotice(outcome, program.name) } });
      return;
    }
    setNotice(adminNotice(outcome, program.name));
    load();
  }

  function handleSaved(result) {
    setEditing(false);
    if (result.publishStatus === "PUBLISHED" || result.publishStatus === "ARCHIVED") {
      setNotice(result.changed ? "Listing updated." : "No changes to save.");
      load();
    } else {
      navigate("/programs", { state: { notice: adminNotice("savedToDraft", program.name) } });
    }
  }

  if (status === "loading") return <p>Loading...</p>;
  if (status === "notFound") return <NotFoundPage what="program" />;
  if (status === "error") return <p className="error">{error}</p>;

  const archived = program.publishStatus === "ARCHIVED";

  return (
    <article className="program-detail">
      <p className="breadcrumb">
        <Link to="/programs">Programs</Link> / <Link to={`/organizations/${program.organization.slug}`}>{program.organization.name}</Link>
      </p>

      {!editing && <ListingAdminBar program={program} onEdit={() => setEditing(true)} onChanged={handleAdminChange} />}
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}

      {editing ? (
        <>
          <h1>Edit: {program.name}</h1>
          <ListingEditor id={program.id} onSaved={handleSaved} onCancel={() => setEditing(false)} />
        </>
      ) : (
        <>
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
        </>
      )}
    </article>
  );
}
