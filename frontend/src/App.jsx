import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { NavBar } from "./components/NavBar.jsx";
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
import { AboutPage } from "./pages/AboutPage.jsx";
import { FaqPage } from "./pages/FaqPage.jsx";
import { ContactPage } from "./pages/ContactPage.jsx";
import { MyMessagesPage } from "./pages/MyMessagesPage.jsx";

function Footer() {
  return (
    <footer className="footer">
      <nav aria-label="Footer" className="footer-links">
        <Link to="/about">About</Link>
        <Link to="/faq">FAQ</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/suggest">Suggest a program</Link>
      </nav>
      Project Exfil &mdash; not affiliated with any listed organization.
    </footer>
  );
}

// /employers was the pre-programs browse URL; keep old links (and their
// filters) working.
function LegacyEmployersRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/programs${search}`} replace />;
}

// Browse and admin use the full width; reading pages keep a narrow column.
const WIDE_ROUTES = ["/programs", "/admin"];

export default function App() {
  const { pathname } = useLocation();
  const wide = WIDE_ROUTES.includes(pathname);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <NavBar />
      <main id="main" className={wide ? "page page-wide" : "page"}>
        <Routes>
          <Route
            path="/"
            element={<HomePage />}
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/programs" element={<ProgramsPage />} />
          <Route path="/programs/:slug" element={<ProgramDetailPage />} />
          <Route path="/organizations/:slug" element={<OrganizationPage />} />
          <Route path="/suggest" element={<SuggestPage />} />
          <Route path="/employers" element={<LegacyEmployersRedirect />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route
            path="/account/messages"
            element={
              <ProtectedRoute>
                <MyMessagesPage />
              </ProtectedRoute>
            }
          />
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
