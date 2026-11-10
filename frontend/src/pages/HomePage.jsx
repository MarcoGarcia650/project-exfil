import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Search, BookmarkCheck, ListChecks } from "lucide-react";
import { PathIllustration } from "../components/PathIllustration.jsx";

export function HomePage() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="home">
      <PathIllustration />

      <h1>Find employers who actually hire veterans</h1>
      <p className="home-lede">
        Veteran hiring pipelines exist at companies like Amazon, Oracle, and Microsoft — but they're
        scattered across LinkedIn posts, individual career pages, and word of mouth. Project Exfil is a
        curated database of real programs, so you can stop guessing which "veteran friendly" claims
        are backed by an actual pipeline.
      </p>

      <div className="home-cta">
        <Link to="/programs" className="button-primary">
          Browse programs
        </Link>
        {isAuthenticated ? (
          <Link to="/dashboard">Go to your dashboard</Link>
        ) : (
          <Link to="/signup">
            Create a free account to save and track programs, and to discuss programs and employers with other veterans
          </Link>
        )}
      </div>

      <div className="home-banner" role="presentation" aria-hidden="true" />

      <div className="home-steps">
        <div className="home-step">
          <Search className="home-step-icon" size={28} strokeWidth={1.75} />
          <h2>Browse &amp; filter</h2>
          <p>Filter real programs by tech track, format, and application status.</p>
        </div>
        <div className="home-step">
          <BookmarkCheck className="home-step-icon" size={28} strokeWidth={1.75} />
          <h2>Save &amp; track</h2>
          <p>Save the employers you're pursuing and track status from research to offer.</p>
        </div>
        <div className="home-step">
          <ListChecks className="home-step-icon" size={28} strokeWidth={1.75} />
          <h2>Get next steps</h2>
          <p>Each saved employer comes with a starting checklist tailored to that program type.</p>
        </div>
      </div>
    </div>
  );
}
