import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useSavedProgramIds } from "../lib/useSavedProgramIds.js";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";
import { ProgramCard } from "../components/ProgramCard.jsx";
import { TECH_TRACK_LABELS, FORMAT_LABELS, AVAILABILITY_LABELS } from "../lib/programLabels.js";

// Filters live in the URL (?techTrack=CLOUD&format=TRAINING&availability=ACCEPTING)
// so a filtered view survives refresh and can be shared. Values not in the
// known lists are dropped here and ignored by the API, so stale links still work.
const FILTERS = [
  { name: "techTrack", all: "All tech tracks", options: TECH_TRACK_LABELS },
  { name: "format", all: "All formats", options: FORMAT_LABELS },
  { name: "availability", all: "Any application status", options: AVAILABILITY_LABELS },
];

export function ProgramsPage() {
  useDocumentTitle("Browse programs");
  const [searchParams, setSearchParams] = useSearchParams();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { savedIds, save, error: saveError } = useSavedProgramIds();

  const active = Object.fromEntries(
    FILTERS.map(({ name, options }) => [name, options[searchParams.get(name)] ? searchParams.get(name) : ""])
  );
  const query = new URLSearchParams(Object.entries(active).filter(([, v]) => v)).toString();
  const hasFilters = query !== "";

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/programs${query ? `?${query}` : ""}`)
      .then(setPrograms)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [query]);

  function handleFilterChange(e) {
    const next = new URLSearchParams(searchParams);
    if (e.target.value) next.set(e.target.name, e.target.value);
    else next.delete(e.target.name);
    setSearchParams(next, { replace: true });
  }

  function clearFilters() {
    setSearchParams({}, { replace: true });
  }

  return (
    <div>
      <h1>Browse programs</h1>
      <p className="page-lede">
        Tech career programs open to veterans after separation, each checked against the provider's
        official page.
      </p>

      <div className="filters">
        {FILTERS.map(({ name, all, options }) => (
          <select key={name} name={name} value={active[name]} onChange={handleFilterChange} aria-label={all}>
            <option value="">{all}</option>
            {Object.entries(options).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        ))}
        {hasFilters && (
          <button type="button" className="button-link" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {saveError && <p className="error">{saveError}</p>}
      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}

      {!loading && !error && (
        <p className="result-count">
          {programs.length} {programs.length === 1 ? "program" : "programs"}
        </p>
      )}

      {!loading && !error && programs.length === 0 && (
        <div className="empty-state">
          <h2>No programs match these filters</h2>
          <p>Try removing a filter, or tell us about a program we're missing.</p>
          <div className="empty-state-actions">
            {hasFilters && <button onClick={clearFilters}>Clear filters</button>}
            <Link to="/suggest">Suggest a program</Link>
          </div>
        </div>
      )}

      <ul className="employer-list">
        {programs.map((program) => (
          <ProgramCard key={program.id} program={program} saved={savedIds.has(program.id)} onSave={save} />
        ))}
      </ul>
    </div>
  );
}
