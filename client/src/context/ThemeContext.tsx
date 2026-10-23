import { flushSync } from "react-dom";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: (button: HTMLButtonElement | null) => void;
}

const THEME_KEY = "spartan-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function readTheme(): Theme {
  return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("light", theme === "light");
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem(THEME_KEY, theme);
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(
    (button: HTMLButtonElement | null) => {
      const nextTheme: Theme = theme === "dark" ? "light" : "dark";
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const startTransition = document.startViewTransition;
      const rect = button?.getBoundingClientRect();

      if (rect) {
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const radius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y),
        );
        document.documentElement.style.setProperty("--theme-x", `${x}px`);
        document.documentElement.style.setProperty("--theme-y", `${y}px`);
        document.documentElement.style.setProperty(
          "--theme-radius",
          `${radius}px`,
        );
      }

      if (startTransition && !reducedMotion && rect) {
        startTransition.call(document, () => {
          flushSync(() => setTheme(nextTheme));
        });
      } else {
        setTheme(nextTheme);
      }
    },
    [theme],
  );

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider.");
  return context;
}
