import { useState, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Compass, Search, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";

// Site-wide search: on /programs it edits ?q= in place (keeping filters);
// anywhere else it goes to /programs?q=….
function HeaderSearch() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const onBrowse = location.pathname === "/programs";
  const current = onBrowse ? params.get("q") ?? "" : "";
  const [draft, setDraft] = useState(current);
  useEffect(() => setDraft(current), [current]);

  function submit(e) {
    e.preventDefault();
    const next = onBrowse ? new URLSearchParams(params) : new URLSearchParams();
    next.delete("listing");
    if (draft.trim()) next.set("q", draft.trim().slice(0, 100));
    else next.delete("q");
    const qs = next.toString();
    navigate(`/programs${qs ? `?${qs}` : ""}`);
  }

  return (
    <form className="header-search" role="search" onSubmit={submit}>
      <Search size={17} aria-hidden="true" />
      <label className="visually-hidden" htmlFor="site-search">
        Search programs
      </label>
      <input
        id="site-search"
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Search programs, skills, organizations"
        maxLength={100}
      />
    </form>
  );
}

export function NavBar() {
  const { isAuthenticated, logout, user } = useAuth();
  const navClass = ({ isActive }) => (isActive ? "nav-link active" : "nav-link");

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        <Compass size={22} strokeWidth={2} aria-hidden="true" />
        Project Exfil
      </Link>
      <HeaderSearch />
      <nav className="navbar-links" aria-label="Main">
        <NavLink to="/programs" className={navClass}>
          Browse
        </NavLink>
        <NavLink to="/about" className={navClass}>
          About
        </NavLink>
        <NavLink to="/faq" className={navClass}>
          FAQ
        </NavLink>
        {user?.role !== "ADMIN" && (
          <NavLink to="/contact" className={navClass}>
            Contact
          </NavLink>
        )}
        {isAuthenticated && (
          <NavLink to="/dashboard" className={navClass}>
            Dashboard
          </NavLink>
        )}
        {user?.role === "ADMIN" && (
          <NavLink to="/admin" className={navClass}>
            Admin
          </NavLink>
        )}
        <ThemeToggle />
        {isAuthenticated ? (
          <>
            {user?.username && (
              <span className="avatar" title={`Signed in as ${user.username}`} aria-label={`Signed in as ${user.username}`}>
                {user.username.charAt(0).toUpperCase()}
              </span>
            )}
            <button type="button" onClick={logout} className="nav-link navbar-logout">
              <LogOut size={16} aria-hidden="true" />
              Log out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={navClass}>
              Log in
            </NavLink>
            <Link to="/signup" className="button-primary nav-cta">
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
