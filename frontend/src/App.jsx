import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { SignupPage } from "./pages/SignupPage.jsx";
import { EmployersPage } from "./pages/EmployersPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";

function NavBar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/employers">VetPath</Link>
      {isAuthenticated && (
        <div className="navbar-links">
          <Link to="/employers">Browse</Link>
          <Link to="/dashboard">Dashboard</Link>
          <button onClick={logout}>Log out</button>
        </div>
      )}
    </nav>
  );
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <NavBar />
      <main className="page">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/employers"
            element={
              <ProtectedRoute>
                <EmployersPage />
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
          <Route
            path="/"
            element={<Navigate to={isAuthenticated ? "/employers" : "/login"} replace />}
          />
        </Routes>
      </main>
    </>
  );
}
