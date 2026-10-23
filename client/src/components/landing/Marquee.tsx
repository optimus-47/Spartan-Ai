import { MARQUEE_ITEMS } from "./data";
import { useReducedMotionSafe } from "./motion";

export function Marquee() {
  const reduced = useReducedMotionSafe();
  const track = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <div aria-hidden="true" className="landing-marquee">
      <div className={`landing-marquee-track${reduced ? " is-static" : ""}`}>
        {track.map((item, index) => (
          <span className="landing-marquee-item" key={`${item}-${index}`}>
            {item}
            <span className="landing-marquee-dot" />
          </span>
        ))}
      </div>
    </div>
  );
}
