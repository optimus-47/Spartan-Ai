import { useRef } from "react";
import { useTheme } from "../context/ThemeContext";

export function ThemeToggle() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="theme-toggle"
      onClick={() => toggleTheme(buttonRef.current)}
      ref={buttonRef}
      type="button"
    >
      <span aria-hidden="true">{theme === "dark" ? "☼" : "◐"}</span>
    </button>
  );
}
