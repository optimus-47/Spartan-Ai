import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Magnetic, Reveal, useReducedMotionSafe } from "./motion";

export default function FinalCta() {
  const reduced = useReducedMotionSafe();

  return (
    <section aria-labelledby="cta-heading" className="final-cta">
      <div aria-hidden="true" className="hero-rings final-cta-rings">
        <span />
        <span />
      </div>
      {!reduced ? (
        <motion.div
          animate={{ rotateY: 360 }}
          aria-hidden="true"
          className="final-cta-silhouette"
          transition={{ duration: 46, repeat: Infinity, ease: "linear" }}
        />
      ) : null}

      <Reveal className="final-cta-inner">
        <h2 id="cta-heading">Begin your first entry.</h2>
        <Magnetic>
          <Link className="button button-primary" to="/signup">
            Create your account
          </Link>
        </Magnetic>
        <p className="final-cta-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </Reveal>
    </section>
  );
}
