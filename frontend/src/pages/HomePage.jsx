import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { TECH_TRACK_LABELS } from "../lib/programLabels.js";
import { useSavedProgramIds } from "../lib/useSavedProgramIds.js";
import { ProgramTile } from "../components/ProgramTile.jsx";
import heroPhoto from "../assets/home-career-summit.jpg";

const RECENT_COUNT = 3;

// Newest verification first; ties broken by name so the order is stable.
function mostRecentlyVerified(programs) {
  return [...programs]
    .sort((a, b) => new Date(b.verifiedOn) - new Date(a.verifiedOn) || a.name.localeCompare(b.name))
    .slice(0, RECENT_COUNT);
}

function HomeSearch() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState("");

  function submit(e) {
    e.preventDefault();
    const q = draft.trim().slice(0, 100);
    navigate(q ? `/programs?${new URLSearchParams({ q })}` : "/programs");
  }

  return (
    <form className="home-search" role="search" onSubmit={submit}>
      <Search size={20} aria-hidden="true" />
      <label className="visually-hidden" htmlFor="home-search-input">
        Search programs
      </label>
      <input
        id="home-search-input"
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={'Try "cloud", "apprenticeship" or "Microsoft"'}
        maxLength={100}
      />
      <button type="submit" className="button-primary">
        Search
      </button>
    </form>
  );
}

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const { savedIds, save, unsave } = useSavedProgramIds();
  const [recent, setRecent] = useState(null); // null = loading

  useEffect(() => {
    let cancelled = false;
    api
      .get("/programs")
      .then((programs) => !cancelled && setRecent(mostRecentlyVerified(programs)))
      .catch(() => !cancelled && setRecent([])); // the section just hides
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-text">
            <p className="home-eyebrow">For veterans moving into tech after separation</p>
            <h1>"Veteran friendly" isn't a plan. A way in is.</h1>
            <p className="home-lede">
              Training, apprenticeships, fellowships and job openings in software, IT, cloud, cybersecurity and
              data. Each one is checked against the provider's own page and says how a separated veteran gets in.
            </p>
            <HomeSearch />
            <div className="home-tracks">
              <span>Browse by track:</span>
              {Object.entries(TECH_TRACK_LABELS).map(([value, label]) => (
                <Link key={value} to={`/programs?techTrack=${value}`} className="home-track">
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <figure className="home-photo">
            <img
              src={heroPhoto}
              alt="Service members in uniform and civilians raise their hands during a career preparation workshop"
              width="1200"
              height="799"
            />
            <figcaption>Career summit at Kadena Air Base, 2026. U.S. Air Force photo by A1C Francisco Huerta.</figcaption>
          </figure>
        </div>
      </section>

      {recent?.length > 0 && (
        <section className="home-section" aria-labelledby="home-recent">
          <div className="home-section-head">
            <h2 id="home-recent">Recently verified</h2>
            <Link to="/programs">See all programs →</Link>
          </div>
          <div className="tile-grid">
            {recent.map((program) => (
              <ProgramTile
                key={program.id}
                program={program}
                saved={savedIds.has(program.id)}
                onSave={save}
                onUnsave={unsave}
              />
            ))}
          </div>
        </section>
      )}

      <section className="home-section" aria-labelledby="home-how">
        <h2 id="home-how">How it works</h2>
        <ol className="home-steps">
          <li className="home-step">
            <span className="home-step-number">1</span>
            <h3>Search and filter</h3>
            <p>Narrow by track, format and whether applications are open. Every filtered view has its own link you can share.</p>
          </li>
          <li className="home-step">
            <span className="home-step-number">2</span>
            <h3>Save and track</h3>
            <p>Save the programs you're pursuing, set where you are with each one, and work through a starting checklist.</p>
          </li>
          <li className="home-step">
            <span className="home-step-number">3</span>
            <h3>Ask and share</h3>
            <p>
              Have a question about a program or organization? Start a discussion on its page, or add what you learned
              to one that's already going.
            </p>
          </li>
        </ol>
      </section>

      <section className="home-section">
        <div className="home-callout">
          {isAuthenticated ? (
            <>
              <div>
                <h2>Pick up where you left off</h2>
                <p>Your saved programs, status and checklists are on your dashboard.</p>
              </div>
              <Link to="/dashboard" className="button-primary">
                Go to your dashboard
              </Link>
            </>
          ) : (
            <>
              <div>
                <h2>Create a free account</h2>
                <p>
                  Save and track programs, and start or join discussions with other veterans. Only your username is
                  ever shown.
                </p>
              </div>
              <Link to="/signup" className="button-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
