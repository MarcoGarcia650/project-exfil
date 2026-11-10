import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { Compass, LogOut } from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { SignupPage } from "./pages/SignupPage.jsx";
import { ProgramsPage } from "./pages/ProgramsPage.jsx";
import { ProgramDetailPage } from "./pages/ProgramDetailPage.jsx";
import { OrganizationPage } from "./pages/OrganizationPage.jsx";
import { SuggestPage } from "./pages/SuggestPage.jsx";
import { NotFoundPage } from "./pages/NotFoundPage.jsx";
import { ResetPasswordPage } from "./pages/ResetPasswordPage.jsx";
import { ChooseUsernamePage } from "./pages/ChooseUsernamePage.jsx";
import { ThreadPage } from "./pages/ThreadPage.jsx";
import { MySubmissionsPage } from "./pages/MySubmissionsPage.jsx";
import { AdminPage } from "./pages/admin/AdminPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";

function NavBar() {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <Compass size={20} strokeWidth={2} />
        Project Exfil
      </Link>
      <div className="navbar-links">
        <Link to="/programs">Browse</Link>
        {isAuthenticated ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            {user?.role === "ADMIN" && <Link to="/admin">Admin</Link>}
            <button onClick={logout} className="navbar-logout">
              <LogOut size={16} />
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/signup">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="footer">
      Project Exfil &mdash; not affiliated with any listed employer.
    </footer>
  );
}

// /employers was the pre-programs browse URL; keep old links (and their
// filters) working.
function LegacyEmployersRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/programs${search}`} replace />;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <NavBar />
      <main className="page">
        <Routes>
          <Route
            path="/"
            element={isAuthenticated ? <Navigate to="/programs" replace /> : <HomePage />}
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/programs" element={<ProgramsPage />} />
          <Route path="/programs/:slug" element={<ProgramDetailPage />} />
          <Route path="/organizations/:slug" element={<OrganizationPage />} />
          <Route path="/suggest" element={<SuggestPage />} />
          <Route path="/employers" element={<LegacyEmployersRedirect />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/comments/:id" element={<ThreadPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/submissions"
            element={
              <ProtectedRoute>
                <MySubmissionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/username"
            element={
              <ProtectedRoute>
                <ChooseUsernamePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
