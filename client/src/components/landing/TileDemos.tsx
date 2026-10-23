import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  DETECTED_FOODS,
  DIARY_ENTRIES,
  DIARY_MACROS,
  DIARY_TOTAL_KCAL,
  DIETS,
  EXERCISE_POOL,
  INJURIES,
  MEAL_PLAN,
  PR_ESTIMATED_1RM,
  PR_PREVIOUS_1RM,
  PR_SETS,
  WEIGHT_MONTHS,
  WEIGHT_SERIES,
  type DietId,
  type FeatureId,
  type InjuryId,
} from "./data";
import { CountUp, EASE_OUT, useReducedMotionSafe } from "./motion";

export interface DemoProps {
  active: boolean;
  expanded?: boolean;
}

function InjuryDemo({ active }: DemoProps) {
  const reduced = useReducedMotionSafe();
  const [selected, setSelected] = useState<InjuryId[]>(["shoulder"]);

  const allowed = useMemo(
    () =>
      EXERCISE_POOL.filter(
        (exercise) =>
          !exercise.conflicts.some((injury) => selected.includes(injury)),
      ).slice(0, 4),
    [selected],
  );

  const toggle = (id: InjuryId) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  return (
    <div className="demo demo-injury">
      <div className="demo-chips">
        {INJURIES.map((injury) => (
          <button
            aria-pressed={selected.includes(injury.id)}
            className={`demo-chip${
              selected.includes(injury.id) ? " is-on" : ""
            }`}
            key={injury.id}
            onClick={() => toggle(injury.id)}
            type="button"
          >
            {injury.label}
          </button>
        ))}
      </div>
      <ul className="demo-list">
        <AnimatePresence initial={false} mode="popLayout">
          {allowed.map((exercise) => (
            <motion.li
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? undefined : { opacity: 0, x: -12 }}
              initial={reduced ? false : { opacity: 0, x: 12 }}
              key={exercise.name}
              layout
              transition={{ duration: 0.4, ease: EASE_OUT }}
            >
              <span>{exercise.name}</span>
              <span className="mono-label">{exercise.detail}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <motion.span
        animate={{ opacity: active ? 1 : 0.4 }}
        className="mono-label demo-badge"
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        VALIDATED
      </motion.span>
    </div>
  );
}

function PhotoDemo({ active }: DemoProps) {
  const reduced = useReducedMotionSafe();
  const animateScan = active && !reduced;

  return (
    <div className="demo demo-photo">
      <div className="demo-plate">
        <svg aria-hidden="true" viewBox="0 0 160 100">
          <circle
            cx="80"
            cy="50"
            fill="none"
            r="40"
            stroke="var(--border)"
            strokeWidth="1"
          />
          <circle cx="66" cy="42" fill="var(--accent-dim)" opacity="0.5" r="15" />
          <rect
            fill="var(--muted)"
            height="22"
            opacity="0.35"
            rx="6"
            width="30"
            x="82"
            y="38"
          />
          <ellipse
            cx="78"
            cy="70"
            fill="var(--accent)"
            opacity="0.3"
            rx="18"
            ry="8"
          />
          {animateScan ? (
            <motion.line
              animate={{ y1: [12, 88, 12], y2: [12, 88, 12] }}
              stroke="var(--accent)"
              strokeWidth="1"
              transition={{ duration: 3.6, repeat: Infinity, ease: "linear" }}
              x1="34"
              x2="126"
            />
          ) : null}
        </svg>
      </div>
      <ul className="demo-detections">
        {DETECTED_FOODS.map((food, index) => (
          <motion.li
            animate={active ? { opacity: 1, y: 0 } : { opacity: 0.35, y: 0 }}
            className={food.confidence < 50 ? "is-low" : ""}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            key={food.name}
            transition={{ duration: 0.45, delay: index * 0.12, ease: EASE_OUT }}
          >
            <span>{food.name}</span>
            <span className="mono-label">{food.grams} G</span>
            <span className="mono-label">{food.confidence}%</span>
          </motion.li>
        ))}
      </ul>
      <motion.button
        animate={
          active && !reduced
            ? { borderColor: ["var(--border)", "var(--accent)", "var(--border)"] }
            : undefined
        }
        className="demo-confirm"
        transition={{ duration: 1.4, delay: 0.8 }}
        type="button"
      >
        Confirm and log
      </motion.button>
      <span className="mono-label demo-caption">
        LOW CONFIDENCE ITEMS ARE FLAGGED, NOT LOGGED
      </span>
    </div>
  );
}

function DiaryDemo({ active }: DemoProps) {
  const reduced = useReducedMotionSafe();

  return (
    <div className="demo demo-diary">
      <div className="demo-sources">
        <span className="demo-source">
          <span className="mono-label">SEARCH</span> paneer
        </span>
        <span className="demo-source">
          <span className="mono-label">PHOTO</span> plate
        </span>
      </div>
      <ul className="demo-list">
        {DIARY_ENTRIES.map((entry, index) => (
          <motion.li
            animate={active ? { opacity: 1, y: 0 } : { opacity: 0.4, y: 0 }}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            key={entry.name}
            transition={{ duration: 0.45, delay: index * 0.09, ease: EASE_OUT }}
          >
            <span>
              <span className="mono-label demo-source-tag">
                {entry.source === "photo" ? "PHOTO" : "SEARCH"}
              </span>
              {entry.name}
            </span>
            <span className="mono-label">{entry.kcal} KCAL</span>
          </motion.li>
        ))}
      </ul>
      <div className="macro-bars">
        {DIARY_MACROS.map((macro, index) => (
          <div className="macro-bar" key={macro.label}>
            <span className="mono-label">{macro.label}</span>
            <span className="macro-track">
              <motion.span
                animate={{ scaleX: active ? macro.pct / 100 : 0.05 }}
                className="macro-fill"
                initial={reduced ? false : { scaleX: 0 }}
                transition={{
                  duration: 0.8,
                  delay: index * 0.1,
                  ease: EASE_OUT,
                }}
              />
            </span>
            <span className="mono-label">{macro.grams} G</span>
          </div>
        ))}
      </div>
      <p className="demo-total">
        <CountUp active={active} to={DIARY_TOTAL_KCAL} />
        <span className="mono-label"> KCAL TODAY</span>
      </p>
      <span className="mono-label demo-caption">SAMPLE DATA</span>
    </div>
  );
}

function PlannerDemo({ active }: DemoProps) {
  const reduced = useReducedMotionSafe();
  const [day, setDay] = useState(0);
  const [diet, setDiet] = useState<DietId>("vegetarian");
  const meals = MEAL_PLAN[diet][day];

  return (
    <div className="demo demo-planner">
      <div className="demo-tabs">
        {[0, 1, 2].map((index) => (
          <button
            aria-pressed={day === index}
            className={`demo-tab${day === index ? " is-on" : ""}`}
            key={index}
            onClick={() => setDay(index)}
            type="button"
          >
            {day === index ? (
              <motion.span
                className="demo-tab-pill"
                layoutId="planner-pill"
                transition={{ duration: 0.35, ease: EASE_OUT }}
              />
            ) : null}
            <span>Day {index + 1}</span>
          </button>
        ))}
      </div>
      <AnimatePresence initial={false} mode="wait">
        <motion.ul
          animate={{ opacity: active ? 1 : 0.4, x: 0 }}
          className="demo-list"
          exit={reduced ? undefined : { opacity: 0, x: -10 }}
          initial={reduced ? false : { opacity: 0, x: 10 }}
          key={`${diet}-${day}`}
          transition={{ duration: 0.35, ease: EASE_OUT }}
        >
          {meals.map((meal, index) => (
            <li key={meal}>
              <span>{meal}</span>
              <span className="mono-label">
                {["MORNING", "MIDDAY", "EVENING"][index]}
              </span>
            </li>
          ))}
        </motion.ul>
      </AnimatePresence>
      <div className="demo-chips">
        {DIETS.map((option) => (
          <button
            aria-pressed={diet === option.id}
            className={`demo-chip${diet === option.id ? " is-on" : ""}`}
            key={option.id}
            onClick={() => setDiet(option.id)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PrDemo({ active }: DemoProps) {
  const reduced = useReducedMotionSafe();
  const trace = active && !reduced;

  return (
    <div className="demo demo-pr">
      <span className="mono-label demo-caption">BACK SQUAT · WORKING SETS</span>
      <ul className="demo-list">
        {PR_SETS.map((entry) => {
          const isRecord = entry.set === PR_SETS.length;
          return (
            <li className={isRecord ? "is-record" : ""} key={entry.set}>
              <span className="mono-label">SET {entry.set}</span>
              <span>
                {entry.weight} kg × {entry.reps}
              </span>
              {isRecord ? (
                <motion.span
                  animate={active ? { opacity: 1, scale: 1.06 } : { opacity: 0.4, scale: 1 }}
                  className="demo-pr-pill mono-label"
                  initial={reduced ? false : { opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5, delay: 0.7, ease: EASE_OUT }}
                >
                  PR
                </motion.span>
              ) : (
                <span className="mono-label">—</span>
              )}
            </li>
          );
        })}
      </ul>
      {trace ? (
        <svg aria-hidden="true" className="demo-pr-trace" viewBox="0 0 300 44">
          <motion.rect
            animate={{ pathLength: 1 }}
            fill="none"
            height="42"
            initial={{ pathLength: 0 }}
            rx="8"
            stroke="var(--accent)"
            strokeWidth="1"
            transition={{ duration: 1.2, delay: 0.3, ease: EASE_OUT }}
            width="298"
            x="1"
            y="1"
          />
        </svg>
      ) : null}
      <p className="demo-total">
        <CountUp active={active} decimals={1} to={PR_ESTIMATED_1RM} />
        <span className="mono-label"> KG ESTIMATED 1RM</span>
      </p>
      <span className="mono-label demo-caption">
        PREVIOUS ESTIMATE {PR_PREVIOUS_1RM} KG · SAMPLE DATA
      </span>
    </div>
  );
}

const CHART_W = 300;
const CHART_H = 110;

function TrendsDemo({ active }: DemoProps) {
  const reduced = useReducedMotionSafe();

  const points = useMemo(() => {
    const min = Math.min(...WEIGHT_SERIES);
    const max = Math.max(...WEIGHT_SERIES);
    const span = max - min || 1;
    return WEIGHT_SERIES.map((value, index) => ({
      x: (index / (WEIGHT_SERIES.length - 1)) * (CHART_W - 16) + 8,
      y: CHART_H - 14 - ((value - min) / span) * (CHART_H - 34),
    }));
  }, []);

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
  const area = `${path} L${points[points.length - 1].x} ${CHART_H} L${points[0].x} ${CHART_H} Z`;

  return (
    <div className="demo demo-trends">
      <svg
        aria-hidden="true"
        className="demo-chart"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      >
        <motion.path
          animate={{ opacity: active ? 0.14 : 0 }}
          d={area}
          fill="var(--accent)"
          transition={{ duration: 0.8, delay: 0.4 }}
        />
        <motion.path
          animate={{ pathLength: active || reduced ? 1 : 0 }}
          d={path}
          fill="none"
          initial={reduced ? false : { pathLength: 0 }}
          stroke="var(--accent)"
          strokeLinecap="round"
          strokeWidth="1.5"
          transition={{ duration: 1.2, ease: EASE_OUT }}
        />
        {active && !reduced ? (
          <motion.circle
            animate={{
              cx: points.map((point) => point.x),
              cy: points.map((point) => point.y),
            }}
            fill="var(--accent)"
            r="3"
            transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
          />
        ) : null}
      </svg>
      <div className="demo-axis">
        {WEIGHT_MONTHS.map((month) => (
          <span className="mono-label" key={month}>
            {month}
          </span>
        ))}
      </div>
      <p className="demo-total">
        <CountUp active={active} decimals={1} from={82.4} to={79.2} />
        <span className="mono-label"> KG · LATEST ENTRY</span>
      </p>
      <span className="mono-label demo-caption">SAMPLE DATA</span>
    </div>
  );
}

export const TILE_DEMOS: Record<
  FeatureId,
  (props: DemoProps) => React.ReactElement
> = {
  injury: InjuryDemo,
  photo: PhotoDemo,
  diary: DiaryDemo,
  planner: PlannerDemo,
  pr: PrDemo,
  trends: TrendsDemo,
};
