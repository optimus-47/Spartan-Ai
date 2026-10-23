import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type MotionStyle,
} from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type PropsWithChildren,
  type ReactNode,
} from "react";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const SPRING_SOFT = { stiffness: 90, damping: 20, mass: 0.6 } as const;
export const SPRING_TIGHT = { stiffness: 120, damping: 24, mass: 0.5 } as const;

export function useReducedMotionSafe(): boolean {
  return useReducedMotion() === true;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    const sync = () => setMatches(list.matches);
    sync();
    list.addEventListener("change", sync);
    return () => list.removeEventListener("change", sync);
  }, [query]);

  return matches;
}

export function useIsTouch(): boolean {
  return useMediaQuery("(pointer: coarse)");
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

interface RevealProps extends PropsWithChildren {
  className?: string;
  delay?: number;
  style?: MotionStyle;
}

export function Reveal({ children, className, delay = 0, style }: RevealProps) {
  const reduced = useReducedMotionSafe();

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 24 }}
      style={style}
      transition={{ duration: 0.7, delay, ease: EASE_OUT }}
      viewport={{ once: true, margin: "-80px" }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
    >
      {children}
    </motion.div>
  );
}

interface WordRevealProps {
  className?: string;
  delay?: number;
  start?: boolean;
  text: string;
}

export function WordReveal({
  className,
  delay = 0,
  start = true,
  text,
}: WordRevealProps) {
  const reduced = useReducedMotionSafe();
  const words = text.split(" ");

  return (
    <span className={className}>
      {words.map((word, index) => (
        <span className="word-mask" key={`${word}-${index}`}>
          <motion.span
            animate={reduced || start ? { y: "0%", opacity: 1 } : undefined}
            className="word-inner"
            initial={reduced ? false : { y: "110%", opacity: 0 }}
            transition={{
              duration: 0.75,
              delay: reduced ? 0 : delay + index * 0.07,
              ease: EASE_OUT,
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

interface CountUpProps {
  active?: boolean;
  className?: string;
  decimals?: number;
  from?: number;
  suffix?: string;
  to: number;
}

export function CountUp({
  active = true,
  className,
  decimals = 0,
  from = 0,
  suffix = "",
  to,
}: CountUpProps) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: false, margin: "-40px" });
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (reduced) {
      setValue(to);
      return;
    }
    if (!inView || !active) return;
    const controls = animate(from, to, {
      duration: 0.9,
      ease: EASE_OUT,
      onUpdate: (latest) => setValue(latest),
    });
    return () => controls.stop();
  }, [active, from, inView, reduced, to]);

  return (
    <span className={className} ref={ref}>
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

interface MagneticProps extends PropsWithChildren {
  className?: string;
  strength?: number;
}

export function Magnetic({ children, className, strength = 6 }: MagneticProps) {
  const reduced = useReducedMotionSafe();
  const touch = useIsTouch();
  const ref = useRef<HTMLSpanElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, SPRING_SOFT);
  const y = useSpring(rawY, SPRING_SOFT);
  const idle = reduced || touch;

  const handleMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (idle || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const offsetX = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
    const offsetY = (event.clientY - (rect.top + rect.height / 2)) / rect.height;
    rawX.set(offsetX * strength * 2);
    rawY.set(offsetY * strength * 2);
  };

  const reset = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <motion.span
      className={className}
      onPointerLeave={reset}
      onPointerMove={handleMove}
      ref={ref}
      style={idle ? { display: "inline-flex" } : { x, y, display: "inline-flex" }}
    >
      {children}
    </motion.span>
  );
}

interface SectionSkeletonProps {
  height: number;
  label?: ReactNode;
}

export function SectionSkeleton({ height, label }: SectionSkeletonProps) {
  return (
    <div aria-hidden="true" className="landing-skeleton" style={{ height }}>
      {label ? <span className="mono-label">{label}</span> : null}
    </div>
  );
}
