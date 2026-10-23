import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { HeroTableau } from "./HeroTableau";
import { EASE_OUT, Magnetic, WordReveal, useReducedMotionSafe } from "./motion";

export function Hero({ start }: { start: boolean }) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const tableauScale = useTransform(scrollYProgress, [0, 1], [1, 0.96]);
  const tableauOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.25]);
  const gridY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const ringsY = useTransform(scrollYProgress, [0, 1], ["0%", "32%"]);

  return (
    <section aria-labelledby="hero-heading" className="hero" ref={ref}>
      <motion.div
        aria-hidden="true"
        className="hero-grid"
        style={reduced ? undefined : { y: gridY }}
      />
      <motion.div
        aria-hidden="true"
        className="hero-rings"
        style={reduced ? undefined : { y: ringsY }}
      >
        <span />
        <span />
        <span />
      </motion.div>

      <div className="hero-inner">
        <div className="hero-copy">
          <motion.p
            animate={start ? { opacity: 1 } : undefined}
            className="eyebrow"
            initial={reduced ? false : { opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
          >
            ENTRY · VOL. I
          </motion.p>
          <h1 className="hero-headline" id="hero-heading">
            <WordReveal
              delay={0.1}
              start={start}
              text="Training, kept in good order."
            />
          </h1>
          <motion.p
            animate={start ? { opacity: 1, y: 0 } : undefined}
            className="hero-paragraph"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            transition={{ duration: 0.7, delay: 0.5, ease: EASE_OUT }}
          >
            Workouts built around your injuries and equipment, meals logged by
            photo or by search, and the trends that follow. One log, kept
            carefully.
          </motion.p>
          <motion.div
            animate={start ? { opacity: 1, y: 0 } : undefined}
            className="hero-actions"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            transition={{ duration: 0.7, delay: 0.65, ease: EASE_OUT }}
          >
            <Magnetic>
              <Link className="button button-primary" to="/signup">
                Create your account
              </Link>
            </Magnetic>
            <Link className="button button-secondary" to="/login">
              Log in
            </Link>
          </motion.div>
        </div>

        <motion.div
          className="hero-stage"
          style={
            reduced
              ? undefined
              : { scale: tableauScale, opacity: tableauOpacity }
          }
        >
          <HeroTableau />
        </motion.div>
      </div>

      <div aria-hidden="true" className="hero-scroll-cue">
        <span className="mono-label">SCROLL</span>
        <span className="hero-scroll-line">
          <span />
        </span>
      </div>
    </section>
  );
}
