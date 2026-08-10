import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { SignupPage } from "./pages/SignupPage.jsx";
import { EmployersPage } from "./pages/EmployersPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";

function NavBar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/">Project Exfil</Link>
      <div className="navbar-links">
        {isAuthenticated ? (
          <>
            <Link to="/employers">Browse</Link>
            <Link to="/dashboard">Dashboard</Link>
            <button onClick={logout}>Log out</button>
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

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <NavBar />
      <main className="page">
        <Routes>
          <Route
            path="/"
            element={isAuthenticated ? <Navigate to="/employers" replace /> : <HomePage />}
          />
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
        </Routes>
      </main>
    </>
  );
}
