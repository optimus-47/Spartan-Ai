import { AnimatePresence, motion } from "framer-motion";
import { useId, useState } from "react";
import { FAQ_ITEMS } from "./data";
import { EASE_OUT, Reveal } from "./motion";

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const baseId = useId();

  return (
    <section aria-labelledby="faq-heading" className="landing-section" id="faq">
      <Reveal className="section-head">
        <p className="eyebrow">CHAPTER 03 · QUESTIONS</p>
        <h2 id="faq-heading">What it does, plainly.</h2>
      </Reveal>

      <div className="faq">
        {FAQ_ITEMS.map((item, index) => {
          const open = openIndex === index;
          const panelId = `${baseId}-panel-${index}`;
          const buttonId = `${baseId}-button-${index}`;

          return (
            <Reveal className="faq-item" key={item.question}>
              <h3 className="faq-question">
                <button
                  aria-controls={panelId}
                  aria-expanded={open}
                  id={buttonId}
                  onClick={() => setOpenIndex(open ? null : index)}
                  type="button"
                >
                  <span>{item.question}</span>
                  <motion.span
                    animate={{ rotate: open ? 45 : 0 }}
                    aria-hidden="true"
                    className="faq-plus"
                    transition={{ duration: 0.3, ease: EASE_OUT }}
                  >
                    +
                  </motion.span>
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {open ? (
                  <motion.div
                    animate={{ height: "auto", opacity: 1 }}
                    aria-labelledby={buttonId}
                    className="faq-answer"
                    exit={{ height: 0, opacity: 0 }}
                    id={panelId}
                    initial={{ height: 0, opacity: 0 }}
                    role="region"
                    transition={{ duration: 0.38, ease: EASE_OUT }}
                  >
                    <p>{item.answer}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
