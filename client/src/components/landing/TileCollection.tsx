import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { FEATURES, type FeatureId } from "./data";
import { Tile3D } from "./Tile3D";
import { TILE_DEMOS } from "./TileDemos";
import {
  EASE_OUT,
  Reveal,
  useIsMobile,
  useReducedMotionSafe,
} from "./motion";
import { TileDetail } from "./TileDetail";

const COUNT = FEATURES.length;

interface CoverflowTileProps {
  active: boolean;
  index: number;
  onOpen: (id: FeatureId) => void;
  progress: MotionValue<number>;
}

function CoverflowTile({ active, index, onOpen, progress }: CoverflowTileProps) {
  const feature = FEATURES[index];
  const Demo = TILE_DEMOS[feature.id];
  const offset = useTransform(progress, (value) => value * (COUNT - 1) - index);

  const x = useTransform(offset, [-2, -1, 0, 1, 2], [560, 300, 0, -300, -560]);
  const rotateY = useTransform(offset, [-2, -1, 0, 1, 2], [52, 38, 0, -38, -52]);
  const z = useTransform(offset, [-2, -1, 0, 1, 2], [-420, -220, 0, -220, -420]);
  const scale = useTransform(offset, [-2, -1, 0, 1, 2], [0.8, 0.9, 1, 0.9, 0.8]);
  const opacity = useTransform(
    offset,
    [-2, -1, 0, 1, 2],
    [0.15, 0.55, 1, 0.55, 0.15],
  );
  const zIndex = useTransform(offset, (value) => 10 - Math.round(Math.abs(value)));
  const pointerEvents = useTransform(offset, (value) =>
    Math.abs(value) < 0.5 ? "auto" : "none",
  );

  return (
    <motion.div
      className="coverflow-slot"
      style={{ x, rotateY, z, scale, opacity, zIndex, pointerEvents }}
    >
      <Tile3D
        demo={<Demo active={active} />}
        numeral={feature.numeral}
        onOpen={() => onOpen(feature.id)}
        title={feature.title}
      />
    </motion.div>
  );
}

function PinnedCollection({
  onOpen,
}: {
  onOpen: (id: FeatureId) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const reduced = useReducedMotionSafe();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 26,
    restDelta: 0.0005,
  });

  useMotionValueEvent(progress, "change", (value) => {
    const next = Math.min(
      COUNT - 1,
      Math.max(0, Math.round(value * (COUNT - 1))),
    );
    setActiveIndex((current) => (current === next ? current : next));
  });

  const scrollToIndex = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container) return;
      const travel = container.offsetHeight - window.innerHeight;
      const top =
        container.offsetTop + (index / (COUNT - 1)) * Math.max(travel, 0);
      window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    },
    [reduced],
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let inView = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
      },
      { threshold: 0.5 },
    );
    observer.observe(stage);

    const onKeyDown = (event: KeyboardEvent) => {
      if (!inView) return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        scrollToIndex(Math.min(COUNT - 1, activeIndex + 1));
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        scrollToIndex(Math.max(0, activeIndex - 1));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, scrollToIndex]);

  const feature = FEATURES[activeIndex];

  return (
    <div
      className="coverflow"
      ref={containerRef}
      style={{ height: `${COUNT * 100}svh` }}
    >
      <div className="coverflow-stage" ref={stageRef}>
        <div className="coverflow-scene">
          {FEATURES.map((item, index) => (
            <CoverflowTile
              active={activeIndex === index}
              index={index}
              key={item.id}
              onOpen={onOpen}
              progress={progress}
            />
          ))}
        </div>

        <div className="coverflow-caption">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              initial={{ opacity: 0, y: 12 }}
              key={feature.id}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            >
              <span className="mono-label">
                {feature.numeral} / {String(COUNT).padStart(2, "0")}
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.lines[0]}</p>
              <p>{feature.lines[1]}</p>
              <button
                className="button button-secondary"
                onClick={() => onOpen(feature.id)}
                type="button"
              >
                View details
              </button>
            </motion.div>
          </AnimatePresence>
        </div>

        <nav aria-label="Feature tiles" className="coverflow-rail">
          {FEATURES.map((item, index) => (
            <button
              aria-current={activeIndex === index}
              className={`coverflow-tick${
                activeIndex === index ? " is-active" : ""
              }`}
              key={item.id}
              onClick={() => scrollToIndex(index)}
              type="button"
            >
              <span className="mono-label">{item.numeral}</span>
              <span aria-hidden="true" className="coverflow-tick-line" />
              <span className="coverflow-tick-label">{item.title}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function CarouselCollection({ onOpen }: { onOpen: (id: FeatureId) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const index = Math.round(
        track.scrollLeft / Math.max(track.clientWidth * 0.82, 1),
      );
      setActiveIndex(Math.min(COUNT - 1, Math.max(0, index)));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="carousel">
      <div className="carousel-track" ref={trackRef}>
        {FEATURES.map((feature, index) => {
          const Demo = TILE_DEMOS[feature.id];
          return (
            <div
              className={`carousel-slide${
                activeIndex === index ? " is-active" : ""
              }`}
              key={feature.id}
            >
              <Tile3D
                demo={<Demo active={activeIndex === index} />}
                numeral={feature.numeral}
                onOpen={() => onOpen(feature.id)}
                title={feature.title}
              />
              <p className="carousel-line">{feature.lines[0]}</p>
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="carousel-dots">
        {FEATURES.map((feature, index) => (
          <span
            className={activeIndex === index ? "is-active" : ""}
            key={feature.id}
          />
        ))}
      </div>
    </div>
  );
}

export default function TileCollection() {
  const mobile = useIsMobile();
  const [openId, setOpenId] = useState<FeatureId | null>(null);
  const handleOpen = useCallback((id: FeatureId) => setOpenId(id), []);
  const handleClose = useCallback(() => setOpenId(null), []);

  return (
    <section
      aria-labelledby="collection-heading"
      className="landing-section"
      id="collection"
    >
      <Reveal className="section-head">
        <p className="eyebrow">CHAPTER 01 · THE COLLECTION</p>
        <h2 id="collection-heading">Six tools. One log.</h2>
        <p className="section-lede">
          Each tile is a working piece of the product. Move through them and try
          the controls inside.
        </p>
      </Reveal>

      {mobile ? (
        <CarouselCollection onOpen={handleOpen} />
      ) : (
        <PinnedCollection onOpen={handleOpen} />
      )}

      <TileDetail featureId={openId} onClose={handleClose} />
    </section>
  );
}
