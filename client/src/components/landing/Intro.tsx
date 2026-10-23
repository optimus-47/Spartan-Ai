import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { EASE_OUT, useReducedMotionSafe } from "./motion";

const INTRO_KEY = "spartan-landing-intro";

export function useIntro(): { showIntro: boolean; dismiss: () => void } {
  const reduced = useReducedMotionSafe();
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (reduced) return;
    if (sessionStorage.getItem(INTRO_KEY) === "seen") return;
    sessionStorage.setItem(INTRO_KEY, "seen");
    setShowIntro(true);
    const timer = window.setTimeout(() => setShowIntro(false), 900);
    return () => window.clearTimeout(timer);
  }, [reduced]);

  return { showIntro, dismiss: () => setShowIntro(false) };
}

export function Intro({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          animate={{ y: 0, opacity: 1 }}
          aria-hidden="true"
          className="landing-intro"
          exit={{ y: "-100%", opacity: 0 }}
          initial={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.65, ease: EASE_OUT }}
        >
          <div className="landing-intro-mark">
            <svg height="64" viewBox="0 0 64 64" width="64">
              <motion.circle
                animate={{ pathLength: 1 }}
                cx="32"
                cy="32"
                fill="none"
                initial={{ pathLength: 0 }}
                r="30"
                stroke="var(--accent)"
                strokeWidth="1.5"
                transition={{ duration: 0.55, ease: EASE_OUT }}
              />
              <text
                dominantBaseline="central"
                fill="var(--text)"
                fontFamily="Space Grotesk, sans-serif"
                fontSize="24"
                fontWeight="700"
                textAnchor="middle"
                x="32"
                y="33"
              >
                S
              </text>
            </svg>
            <motion.span
              animate={{ opacity: 1 }}
              className="landing-intro-word"
              initial={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.4, ease: EASE_OUT }}
            >
              SPARTAN AI
            </motion.span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
