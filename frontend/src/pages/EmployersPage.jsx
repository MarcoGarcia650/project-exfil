import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { EmployerBadge } from "../components/EmployerBadge.jsx";

const TECH_TRACKS = ["SOFTWARE_DEV", "IT_SUPPORT", "CLOUD", "CYBERSECURITY", "DATA"];
const FORMATS = ["TRAINING", "CERTIFICATION_TRAINING", "FELLOWSHIP", "INTERNSHIP", "APPRENTICESHIP", "DIRECT_HIRE"];
const AVAILABILITY_LABELS = {
  ACCEPTING: "Accepting applications",
  ROLLING: "Rolling applications",
  CLOSED: "Applications closed",
  UNKNOWN: "Application status unknown",
};
const label = (value) => value.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

export function EmployersPage() {
  const { token } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [filters, setFilters] = useState({ techTrack: "", format: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [saveError, setSaveError] = useState(null);

  // Re-runs whenever `filters` changes — including on the first render,
  // since every value in the dependency array is "new" at that point.
  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
    );

    api
      .get(`/programs?${params.toString()}`)
      .then(setPrograms)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters]);

  function handleFilterChange(e) {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  }

  async function handleSave(programId) {
    setSaveError(null);
    try {
      await api.post("/saved-employers", { programId }, token);
      setSavedIds((prev) => new Set(prev).add(programId));
    } catch (err) {
      setSaveError(err.message);
    }
  }

  return (
    <div>
      <h1>Browse programs</h1>

      <div className="filters">
        <select name="techTrack" value={filters.techTrack} onChange={handleFilterChange}>
          <option value="">All tech tracks</option>
          {TECH_TRACKS.map((t) => (
            <option key={t} value={t}>
              {label(t)}
            </option>
          ))}
        </select>
        <select name="format" value={filters.format} onChange={handleFilterChange}>
          <option value="">All formats</option>
          {FORMATS.map((f) => (
            <option key={f} value={f}>
              {label(f)}
            </option>
          ))}
        </select>
      </div>

      {saveError && <p className="error">{saveError}</p>}
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}

      <ul className="employer-list">
        {programs.map((program) => (
          <li key={program.id} className="employer-card">
            <div className="employer-card-header">
              <EmployerBadge name={program.organization.name} />
              <div>
                <h2>{program.name}</h2>
                <p className="program-name">
                  {program.organization.name} &middot; {label(program.format)}
                </p>
              </div>
            </div>
            <p>{program.description}</p>
            <p className="program-meta">
              {AVAILABILITY_LABELS[program.applicationAvailability]} &middot; Last verified{" "}
              {new Date(program.verifiedOn).toLocaleDateString(undefined, { timeZone: "UTC" })}
            </p>
            <p>
              <a href={program.officialSourceUrl} target="_blank" rel="noreferrer" className="program-link">
                Official program page <ExternalLink size={14} />
              </a>
            </p>
            <button onClick={() => handleSave(program.id)} disabled={savedIds.has(program.id)}>
              {savedIds.has(program.id) ? "Saved" : "Save"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
