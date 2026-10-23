import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useRef, useState } from "react";
import { EXPLODED_PLATES } from "./data";
import {
  EASE_OUT,
  Reveal,
  useIsMobile,
  useReducedMotionSafe,
} from "./motion";

const COUNT = EXPLODED_PLATES.length;

function Plate({
  index,
  progress,
}: {
  index: number;
  progress: MotionValue<number>;
}) {
  const plate = EXPLODED_PLATES[index];
  const spread = useTransform(progress, [0, 0.85], [0, 1]);
  const z = useTransform(spread, [0, 1], [index * -6, (index - 2) * 150]);
  const y = useTransform(spread, [0, 1], [index * -4, (index - 2) * 86]);
  const litAt = index / COUNT;
  const opacity = useTransform(
    progress,
    [Math.max(litAt - 0.12, 0), litAt + 0.06],
    [0.35, 1],
  );

  return (
    <motion.div
      className={`plate${plate.ai ? " plate-ai" : ""}`}
      style={{ z, y, opacity }}
    >
      <span className="mono-label plate-numeral">{plate.numeral}</span>
      <span className="plate-title">{plate.title}</span>
      {plate.ai ? <span className="mono-label ai-tag">AI</span> : null}
    </motion.div>
  );
}

function PinnedExploded() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const next = Math.min(COUNT - 1, Math.floor(value * COUNT));
    setStep((current) => (current === next ? current : Math.max(0, next)));
  });

  const connector = useTransform(scrollYProgress, [0.1, 0.8], [0, 1]);

  return (
    <div
      className="exploded"
      ref={containerRef}
      style={{ height: `${COUNT * 70}svh` }}
    >
      <div className="exploded-stage">
        <div className="exploded-scene">
          <div className="exploded-stack">
            {EXPLODED_PLATES.map((plate, index) => (
              <Plate index={index} key={plate.numeral} progress={scrollYProgress} />
            ))}
            <svg
              aria-hidden="true"
              className="exploded-connector"
              viewBox="0 0 10 400"
            >
              <motion.line
                stroke="var(--accent-dim)"
                strokeDasharray="4 6"
                strokeWidth="1"
                style={{ pathLength: connector }}
                x1="5"
                x2="5"
                y1="0"
                y2="400"
              />
            </svg>
          </div>
        </div>

        <div className="exploded-caption">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              initial={{ opacity: 0, y: 10 }}
              key={EXPLODED_PLATES[step].numeral}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            >
              <span className="mono-label">
                STEP {EXPLODED_PLATES[step].numeral} / {COUNT}
              </span>
              <h3>{EXPLODED_PLATES[step].title}</h3>
              <p>{EXPLODED_PLATES[step].caption}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StackedExploded() {
  return (
    <ol className="exploded-list">
      {EXPLODED_PLATES.map((plate) => (
        <Reveal key={plate.numeral}>
          <li className={plate.ai ? "plate-ai" : ""}>
            <span className="mono-label plate-numeral">{plate.numeral}</span>
            <div>
              <h3>{plate.title}</h3>
              <p>{plate.caption}</p>
            </div>
          </li>
        </Reveal>
      ))}
    </ol>
  );
}

export default function ExplodedStack() {
  const mobile = useIsMobile();
  const reduced = useReducedMotionSafe();

  return (
    <section
      aria-labelledby="how-heading"
      className="landing-section"
      id="how-it-works"
    >
      <Reveal className="section-head">
        <p className="eyebrow">CHAPTER 02 · HOW IT WORKS</p>
        <h2 id="how-heading">The AI proposes. Code decides.</h2>
        <p className="section-lede">
          The plan passes through five stages. Two of them are plain code, and
          they bracket the model on both sides.
        </p>
      </Reveal>
      {mobile || reduced ? <StackedExploded /> : <PinnedExploded />}
    </section>
  );
}
