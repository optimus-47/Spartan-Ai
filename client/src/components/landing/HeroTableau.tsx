import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { CountUp, EASE_OUT, useIsTouch, useReducedMotionSafe } from "./motion";
import { DIARY_MACROS, HERO_SESSION } from "./data";

const MAX_TILT = 7;

export function HeroTableau() {
  const reduced = useReducedMotionSafe();
  const touch = useIsTouch();
  const stageRef = useRef<HTMLDivElement>(null);
  const idle = reduced || touch;

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 100, damping: 22 });
  const springY = useSpring(pointerY, { stiffness: 100, damping: 22 });

  const rotateY = useTransform(springX, [-1, 1], [-MAX_TILT, MAX_TILT]);
  const rotateX = useTransform(springY, [-1, 1], [MAX_TILT, -MAX_TILT]);
  const shiftNear = useTransform(springX, [-1, 1], [14, -14]);
  const shiftFar = useTransform(springX, [-1, 1], [-10, 10]);

  const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (idle || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    pointerX.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
    pointerY.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
  };

  const reset = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  const float = (offset: number) =>
    idle
      ? undefined
      : {
          y: [0, -6, 0],
          transition: {
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut" as const,
            delay: offset,
          },
        };

  return (
    <div
      aria-hidden="true"
      className="hero-tableau"
      onPointerLeave={reset}
      onPointerMove={handleMove}
      ref={stageRef}
    >
      <motion.div
        className="hero-tableau-stage"
        style={idle ? undefined : { rotateX, rotateY }}
      >
        <motion.div
          animate={float(0)}
          className="tableau-card tableau-session metal-edge"
          style={idle ? undefined : { x: shiftNear, z: 90 }}
        >
          <div className="tableau-head">
            <span className="mono-label">TODAY&apos;S SESSION</span>
            <span className="mono-label">PUSH · 52 MIN</span>
          </div>
          <div className="ai-marked">
            <span className="mono-label ai-tag">AI GENERATED</span>
            <ul className="tableau-rows">
              {HERO_SESSION.map((row, index) => (
                <motion.li
                  animate={{ opacity: 1, y: 0 }}
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  key={row.name}
                  transition={{
                    duration: 0.6,
                    delay: 0.5 + index * 0.1,
                    ease: EASE_OUT,
                  }}
                >
                  <span className="tableau-row-name">{row.name}</span>
                  <span className="tableau-row-scheme">{row.scheme}</span>
                  <span className="mono-label">{row.rpe}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>

        <motion.div
          animate={float(1.4)}
          className="tableau-card tableau-fuel metal-edge"
          style={idle ? undefined : { x: shiftFar, z: 20 }}
        >
          <div className="tableau-head">
            <span className="mono-label">FUEL</span>
            <span className="mono-label">SAMPLE DATA</span>
          </div>
          <p className="tableau-kcal">
            <CountUp to={1131} />
            <span className="mono-label"> KCAL</span>
          </p>
          <div className="macro-bars">
            {DIARY_MACROS.map((macro, index) => (
              <div className="macro-bar" key={macro.label}>
                <span className="mono-label">{macro.label}</span>
                <span className="macro-track">
                  <motion.span
                    animate={{ scaleX: macro.pct / 100 }}
                    className="macro-fill"
                    initial={reduced ? false : { scaleX: 0 }}
                    transition={{
                      duration: 0.9,
                      delay: 0.6 + index * 0.12,
                      ease: EASE_OUT,
                    }}
                  />
                </span>
                <span className="mono-label">{macro.grams} G</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          animate={float(2.6)}
          className="tableau-pr"
          style={idle ? undefined : { z: 120 }}
        >
          <svg aria-hidden="true" height="100%" viewBox="0 0 120 34" width="100%">
            <motion.rect
              animate={{ pathLength: 1 }}
              fill="none"
              height="32"
              initial={reduced ? false : { pathLength: 0 }}
              rx="16"
              stroke="var(--accent)"
              strokeWidth="1"
              transition={{ duration: 1.1, delay: 1.1, ease: EASE_OUT }}
              width="118"
              x="1"
              y="1"
            />
          </svg>
          <span className="mono-label">NEW PR</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
