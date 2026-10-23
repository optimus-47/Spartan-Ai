import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import { SlowRequestNotice } from "./SlowRequestNotice";

export function AppShell() {
  const { user, logout, error } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link aria-label="Spartan AI home" className="brand" to="/">
          <span aria-hidden="true" className="brand-mark">S</span>
          <span>SPARTAN <span className="brand-light">AI</span></span>
        </Link>
        <div className="topbar-actions">
          {user ? (
            <button className="text-button" onClick={handleLogout} type="button">
              Sign out
            </button>
          ) : (
            <Link className="text-button" to="/login">Log in</Link>
          )}
          <ThemeToggle />
        </div>
      </header>
      <SlowRequestNotice />
      {error && (
        <div className="session-notice" role="status">
          {error} Your saved session is still available; retry when the server is
          ready.
        </div>
      )}
      <main className="page-content">
        <Outlet />
      </main>
      <footer className="footer">
        <span>FIELD LOG · SPARTAN AI</span>
        <span>Train with intention.</span>
      </footer>
    </div>
  );
}
