import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import { api } from "../lib/api.js";
import { useSavedProgramIds } from "../lib/useSavedProgramIds.js";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";
import { ProgramTile } from "../components/ProgramTile.jsx";
import { ProgramModal } from "../components/ProgramModal.jsx";
import { TECH_TRACK_LABELS, FORMAT_LABELS, AVAILABILITY_LABELS } from "../lib/programLabels.js";

// Everything lives in the URL so any view can be shared or bookmarked:
//   ?q=cloud&techTrack=CLOUD,DATA&format=TRAINING&availability=ACCEPTING&listing=<slug>
// Unknown values are dropped here (and ignored by the API).
const FILTERS = [
  { name: "techTrack", legend: "Tech track", options: TECH_TRACK_LABELS },
  { name: "format", legend: "Format", options: FORMAT_LABELS },
  { name: "availability", legend: "Application status", options: AVAILABILITY_LABELS },
];

const readList = (params, name, options) =>
  (params.get(name) ?? "").split(",").filter((v) => Object.hasOwn(options, v));

export function ProgramsPage() {
  useDocumentTitle("Browse programs");
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { savedIds, save, unsave, error: saveError } = useSavedProgramIds();
  const openerRef = useRef(null);
  const [filtersOpen] = useState(() => !window.matchMedia("(max-width: 720px)").matches);

  const q = (params.get("q") ?? "").trim().slice(0, 100);
  const selected = Object.fromEntries(FILTERS.map(({ name, options }) => [name, readList(params, name, options)]));
  const apiQuery = new URLSearchParams([
    ...(q ? [["q", q]] : []),
    ...FILTERS.filter(({ name }) => selected[name].length).map(({ name }) => [name, selected[name].join(",")]),
  ]).toString();
  const hasFilters = apiQuery !== "";
  const listingSlug = params.get("listing");
  const openProgram = listingSlug ? programs.find((p) => p.slug === listingSlug) : null;

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/programs${apiQuery ? `?${apiQuery}` : ""}`)
      .then(setPrograms)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [apiQuery]);

  function update(mutate, options = { replace: true }) {
    const next = new URLSearchParams(params);
    mutate(next);
    setParams(next, options);
  }

  function toggle(name, value) {
    update((next) => {
      const current = new Set(selected[name]);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      if (current.size) next.set(name, [...current].join(","));
      else next.delete(name);
    });
  }

  function clearAll() {
    update((next) => {
      for (const { name } of FILTERS) next.delete(name);
      next.delete("q");
    });
  }

  // Opening pushes a history entry, so Back closes the modal.
  function open(program, opener) {
    openerRef.current = opener;
    update((next) => next.set("listing", program.slug), { state: { listingModal: true } });
  }

  function close() {
    if (location.state?.listingModal) navigate(-1);
    else update((next) => next.delete("listing"));
    // Return focus to the card that opened it.
    setTimeout(() => openerRef.current?.focus(), 0);
  }

  const activeCount = FILTERS.reduce((n, { name }) => n + selected[name].length, 0) + (q ? 1 : 0);

  return (
    <div className="browse">
      <aside className="filter-panel" aria-label="Filters">
        <details open={filtersOpen}>
          <summary>
            <span>Filters{activeCount ? ` (${activeCount})` : ""}</span>
          </summary>
          <div className="filter-groups">
            {FILTERS.map(({ name, legend, options }) => (
              <fieldset key={name}>
                <legend>{legend}</legend>
                {Object.entries(options).map(([value, text]) => (
                  <label key={value} className="check">
                    <input
                      type="checkbox"
                      checked={selected[name].includes(value)}
                      onChange={() => toggle(name, value)}
                    />
                    {text}
                  </label>
                ))}
              </fieldset>
            ))}
            {hasFilters && (
              <button type="button" className="button-link" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>
        </details>
      </aside>

      <section className="browse-results" aria-labelledby="browse-heading">
        <div className="browse-header">
          <h1 id="browse-heading">Tech programs for veterans</h1>
          {!loading && !error && (
            <p className="result-count" aria-live="polite">
              {programs.length} {programs.length === 1 ? "program" : "programs"}
            </p>
          )}
        </div>
        <p className="page-lede">
          Open to veterans after separation, each checked against the provider's official page.
        </p>

        {q && (
          <p className="search-chip">
            Results for “{q}”
            <button
              type="button"
              className="icon-button small"
              onClick={() => update((next) => next.delete("q"))}
              aria-label="Clear search"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </p>
        )}

        {saveError && <p className="error">{saveError}</p>}
        {error && <p className="error">{error}</p>}
        {loading && <p className="muted">Loading…</p>}

        {!loading && !error && programs.length === 0 && (
          <div className="empty-state">
            <h2>{q ? `No programs match “${q}”` : "No programs match these filters"}</h2>
            <p>Try another search or remove a filter, or tell us about a program we're missing.</p>
            <div className="empty-state-actions">
              {hasFilters && <button onClick={clearAll}>Clear filters</button>}
              <Link to="/suggest">Suggest a program</Link>
            </div>
          </div>
        )}

        <div className="tile-grid">
          {programs.map((program) => (
            <ProgramTile
              key={program.id}
              program={program}
              saved={savedIds.has(program.id)}
              onSave={save}
              onUnsave={unsave}
              onOpen={open}
            />
          ))}
        </div>
      </section>

      {openProgram && (
        <ProgramModal
          key={openProgram.id}
          program={openProgram}
          saved={savedIds.has(openProgram.id)}
          onSave={save}
          onUnsave={unsave}
          onClose={close}
        />
      )}
    </div>
  );
}
