import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { EmployerBadge } from "../components/EmployerBadge.jsx";

const PROGRAM_TYPES = ["INTERNSHIP_PIPELINE", "DIRECT_HIRE", "APPRENTICESHIP", "FELLOWSHIP", "OTHER"];

export function EmployersPage() {
  const { token } = useAuth();
  const [employers, setEmployers] = useState([]);
  const [filters, setFilters] = useState({ industryTag: "", programType: "", location: "" });
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
      .get(`/employers?${params.toString()}`)
      .then(setEmployers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters]);

  function handleFilterChange(e) {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  }

  async function handleSave(employerId) {
    setSaveError(null);
    try {
      await api.post("/saved-employers", { employerId }, token);
      setSavedIds((prev) => new Set(prev).add(employerId));
    } catch (err) {
      setSaveError(err.message);
    }
  }

  return (
    <div>
      <h1>Browse employers</h1>

      <div className="filters">
        <input
          name="industryTag"
          placeholder="Industry tag (e.g. tech)"
          value={filters.industryTag}
          onChange={handleFilterChange}
        />
        <select name="programType" value={filters.programType} onChange={handleFilterChange}>
          <option value="">All program types</option>
          {PROGRAM_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <input
          name="location"
          placeholder="Location (e.g. Remote)"
          value={filters.location}
          onChange={handleFilterChange}
        />
      </div>

      {saveError && <p className="error">{saveError}</p>}
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}

      <ul className="employer-list">
        {employers.map((employer) => (
          <li key={employer.id} className="employer-card">
            <div className="employer-card-header">
              <EmployerBadge name={employer.name} />
              <div>
                <h2>{employer.name}</h2>
                <p className="program-name">{employer.programName}</p>
              </div>
            </div>
            <p>{employer.description}</p>
            <p>
              <a href={employer.url} target="_blank" rel="noreferrer" className="program-link">
                Program page <ExternalLink size={14} />
              </a>
            </p>
            <button onClick={() => handleSave(employer.id)} disabled={savedIds.has(employer.id)}>
              {savedIds.has(employer.id) ? "Saved" : "Save"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
