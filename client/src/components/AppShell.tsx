import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { guestLimitEventName } from "../lib/api";
import { ThemeToggle } from "./ThemeToggle";
import { SlowRequestNotice } from "./SlowRequestNotice";

export function AppShell() {
  const { user, logout, error } = useAuth();
  const navigate = useNavigate();
  const [guestLimitMessage, setGuestLimitMessage] = useState("");

  useEffect(() => {
    const handleGuestLimit = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const message = event.detail?.message;
      if (typeof message === "string") setGuestLimitMessage(message);
    };
    window.addEventListener(guestLimitEventName, handleGuestLimit);
    return () =>
      window.removeEventListener(guestLimitEventName, handleGuestLimit);
  }, []);

  const handleLogout = () => {
    const wasGuest = user?.isGuest === true;
    logout();
    navigate(wasGuest ? "/" : "/login", { replace: true });
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
      {user?.isGuest && (
        <aside className="demo-banner" role="status">
          <span>
            Demo account · sample data · removed after 3 days. Demo data does
            not carry over to a real account.
          </span>
          <Link to="/signup">Create account</Link>
        </aside>
      )}
      <SlowRequestNotice />
      {guestLimitMessage && (
        <div className="guest-limit-notice" role="alert">
          <span>{guestLimitMessage}</span>
          <Link to="/signup">Create a free account</Link>
        </div>
      )}
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
