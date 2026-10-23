import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "../ThemeToggle";
import { SECTIONS } from "./data";
import { EASE_OUT, useReducedMotionSafe } from "./motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      className="landing-progress"
      style={{ scaleX }}
    />
  );
}

export function Grain() {
  return <div aria-hidden="true" className="landing-grain" />;
}

function scrollToSection(id: string, reduced: boolean) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
}

export function LandingHeader() {
  const reduced = useReducedMotionSafe();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const targets = SECTIONS.map(({ id }) => document.getElementById(id)).filter(
      (node): node is HTMLElement => node !== null,
    );
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.2, 0.6] },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    sheetRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const handleNavClick = (id: string) => {
    setMenuOpen(false);
    scrollToSection(id, reduced);
  };

  return (
    <header className={`landing-header${scrolled ? " is-scrolled" : ""}`}>
      <Link aria-label="Spartan AI home" className="landing-brand" to="/">
        <span aria-hidden="true" className="landing-brand-mark">
          S
        </span>
        <span>SPARTAN AI</span>
      </Link>

      <nav aria-label="Sections" className="landing-nav">
        {SECTIONS.map((section) => (
          <button
            className={`landing-nav-link${
              activeSection === section.id ? " is-active" : ""
            }`}
            key={section.id}
            onClick={() => handleNavClick(section.id)}
            type="button"
          >
            {section.label}
            {activeSection === section.id ? (
              <motion.span
                className="landing-nav-underline"
                layoutId="landing-nav-underline"
                transition={{ duration: 0.35, ease: EASE_OUT }}
              />
            ) : null}
          </button>
        ))}
      </nav>

      <div className="landing-header-actions">
        <Link className="landing-text-link" to="/login">
          Log in
        </Link>
        <ThemeToggle />
        <Link className="button button-primary landing-header-cta" to="/signup">
          Create account
        </Link>
        <button
          aria-expanded={menuOpen}
          aria-label="Open menu"
          className="landing-menu-button"
          onClick={() => setMenuOpen(true)}
          type="button"
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            aria-label="Menu"
            aria-modal="true"
            className="landing-sheet"
            exit={{ opacity: 0, y: -12 }}
            initial={{ opacity: 0, y: -12 }}
            ref={sheetRef}
            role="dialog"
            transition={{ duration: 0.3, ease: EASE_OUT }}
          >
            <button
              aria-label="Close menu"
              className="landing-sheet-close"
              onClick={() => setMenuOpen(false)}
              type="button"
            >
              Close
            </button>
            <div className="landing-sheet-links">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleNavClick(section.id)}
                  type="button"
                >
                  {section.label}
                </button>
              ))}
              <Link onClick={() => setMenuOpen(false)} to="/login">
                Log in
              </Link>
              <Link onClick={() => setMenuOpen(false)} to="/signup">
                Create account
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
