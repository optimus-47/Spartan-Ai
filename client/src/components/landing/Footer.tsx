import { ThemeToggle } from "../ThemeToggle";

export default function Footer() {
  return (
    <footer className="landing-footer">
      <span className="landing-brand">
        <span aria-hidden="true" className="landing-brand-mark">
          S
        </span>
        <span>SPARTAN AI</span>
      </span>
      <span className="mono-label">SPARTAN AI · FIELD LOG · VOL. I</span>
      <ThemeToggle />
    </footer>
  );
}
