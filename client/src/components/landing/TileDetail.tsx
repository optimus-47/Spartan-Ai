import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { FEATURES, type FeatureId } from "./data";
import { TILE_DEMOS } from "./TileDemos";
import { EASE_OUT } from "./motion";

interface TileDetailProps {
  featureId: FeatureId | null;
  onClose: () => void;
}

export function TileDetail({ featureId, onClose }: TileDetailProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const feature = FEATURES.find((item) => item.id === featureId) ?? null;

  useEffect(() => {
    if (!feature) return;
    const opener = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href]',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [feature, onClose]);

  const Demo = feature ? TILE_DEMOS[feature.id] : null;

  return (
    <AnimatePresence>
      {feature && Demo ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="tile-detail-backdrop"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            aria-labelledby="tile-detail-title"
            aria-modal="true"
            className="tile-detail metal-edge"
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            onClick={(event) => event.stopPropagation()}
            ref={dialogRef}
            role="dialog"
            transition={{ duration: 0.4, ease: EASE_OUT }}
          >
            <div className="tile-detail-head">
              <span className="mono-label">
                {feature.numeral} / {String(FEATURES.length).padStart(2, "0")}
              </span>
              <button
                className="tile-detail-close"
                onClick={onClose}
                type="button"
              >
                Close
              </button>
            </div>
            <h3 className="tile-detail-title" id="tile-detail-title">
              {feature.title}
            </h3>
            <div className="tile-detail-body">
              <div className="tile-detail-demo">
                <Demo active expanded />
              </div>
              <div className="tile-detail-copy">
                <ul>
                  {feature.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                <p className="mono-label tile-detail-how">
                  HOW IT WORKS · {feature.how}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
