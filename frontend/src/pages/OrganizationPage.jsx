import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useSavedProgramIds } from "../lib/useSavedProgramIds.js";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";
import { EmployerBadge } from "../components/EmployerBadge.jsx";
import { ProgramTile } from "../components/ProgramTile.jsx";
import { NotFoundPage } from "./NotFoundPage.jsx";
import { CommentsSection } from "../components/CommentsSection.jsx";
import { OrganizationAdminBar } from "./admin/OrganizationAdminBar.jsx";

// /organizations/:slug — public. Active programs, then archived ones
// (linked, so their reasons stay readable). Drafts never appear.
// Admins also get edit/delete tools, and can open an organization that has
// nothing public (the public page would 404) so they can clean it up.
export function OrganizationPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [org, setOrg] = useState(null);
  const [admin, setAdmin] = useState(null); // admin view, admins only
  const [status, setStatus] = useState("loading"); // loading | ok | adminOnly | notFound | error
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const { savedIds, save, unsave, error: saveError } = useSavedProgramIds();
  useDocumentTitle(org?.name ?? admin?.name);

  const load = useCallback(async () => {
    const [pub, adm] = await Promise.allSettled([
      api.get(`/organizations/${encodeURIComponent(slug)}`),
      isAdmin ? api.get(`/admin/organizations/${encodeURIComponent(slug)}`, token) : Promise.reject(null),
    ]);
    setAdmin(adm.status === "fulfilled" ? adm.value : null);
    if (pub.status === "fulfilled") {
      setOrg(pub.value);
      setStatus("ok");
    } else if (pub.reason?.status === 404) {
      setOrg(null);
      setStatus(adm.status === "fulfilled" ? "adminOnly" : "notFound");
    } else {
      setError(pub.reason?.message ?? "Couldn't load this organization");
      setStatus("error");
    }
  }, [slug, isAdmin, token]);

  useEffect(() => {
    setStatus("loading");
    setNotice(null);
    load();
  }, [load]);

  const adminBar = admin && (
    <OrganizationAdminBar
      key={`${admin.id}:${admin.name}:${admin.websiteUrl}`}
      admin={admin}
      onSaved={() => {
        setNotice("Organization updated.");
        load();
      }}
      onDeleted={() => navigate("/programs", { state: { notice: `Deleted the organization "${admin.name}".` } })}
    />
  );

  if (status === "loading") return <p>Loading...</p>;
  if (status === "notFound") return <NotFoundPage what="organization" />;
  if (status === "error") return <p className="error">{error}</p>;

  if (status === "adminOnly") {
    return (
      <div>
        <p className="breadcrumb">
          <Link to="/programs">Programs</Link> / {admin.name}
        </p>
        <h1>{admin.name}</h1>
        <p className="listing-notice">
          Only admins can see this page: the organization has no published or archived listings, so its public page
          doesn't exist.
        </p>
        {notice && (
          <p className="success" role="status">
            {notice}
          </p>
        )}
        {adminBar}
      </div>
    );
  }

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
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      {adminBar}

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
