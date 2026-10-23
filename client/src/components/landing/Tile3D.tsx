import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { SPRING_TIGHT, useIsTouch, useReducedMotionSafe } from "./motion";

const MAX_TILT = 8;

interface Tile3DProps {
  demo: ReactNode;
  layoutId?: string;
  numeral: string;
  onOpen?: () => void;
  title: string;
}

export function Tile3D({
  demo,
  layoutId,
  numeral,
  onOpen,
  title,
}: Tile3DProps) {
  const reduced = useReducedMotionSafe();
  const touch = useIsTouch();
  const ref = useRef<HTMLDivElement>(null);
  const idle = reduced || touch;

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sheenX = useMotionValue(50);
  const sheenY = useMotionValue(50);

  const sx = useSpring(px, SPRING_TIGHT);
  const sy = useSpring(py, SPRING_TIGHT);
  const rotateY = useTransform(sx, [-1, 1], [-MAX_TILT, MAX_TILT]);
  const rotateX = useTransform(sy, [-1, 1], [MAX_TILT, -MAX_TILT]);
  const sheen = useTransform(
    [sheenX, sheenY],
    ([x, y]: number[]) =>
      `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.55), rgba(255,255,255,0) 55%)`,
  );

  const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (idle || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width;
    const ny = (event.clientY - rect.top) / rect.height;
    px.set(nx * 2 - 1);
    py.set(ny * 2 - 1);
    sheenX.set(nx * 100);
    sheenY.set(ny * 100);
  };

  const reset = () => {
    px.set(0);
    py.set(0);
    sheenX.set(50);
    sheenY.set(50);
  };

  return (
    <motion.div
      className="tile3d"
      layoutId={layoutId}
      onPointerLeave={reset}
      onPointerMove={handleMove}
      ref={ref}
      style={idle ? undefined : { rotateX, rotateY }}
      whileHover={idle ? undefined : { scale: 1.015 }}
    >
      <span aria-hidden="true" className="tile3d-slab tile3d-slab-a" />
      <span aria-hidden="true" className="tile3d-slab tile3d-slab-b" />
      <div className="tile3d-face metal-edge">
        <motion.span
          aria-hidden="true"
          className="tile3d-sheen"
          style={idle ? undefined : { backgroundImage: sheen }}
        />
        <span className="tile3d-numeral mono-label">{numeral}</span>
        <h3 className="tile3d-title">{title}</h3>
        <div className="tile3d-demo">{demo}</div>
        {onOpen ? (
          <button className="tile3d-open" onClick={onOpen} type="button">
            View details
            <span aria-hidden="true"> →</span>
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}
