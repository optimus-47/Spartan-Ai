import { lazy, Suspense } from "react";
import { Grain, LandingHeader, ScrollProgress } from "../components/landing/Chrome";
import { Hero } from "../components/landing/Hero";
import { Intro, useIntro } from "../components/landing/Intro";
import { Marquee } from "../components/landing/Marquee";
import { SectionSkeleton } from "../components/landing/motion";

const TileCollection = lazy(
  () => import("../components/landing/TileCollection"),
);
const ExplodedStack = lazy(
  () => import("../components/landing/ExplodedStack"),
);
const Faq = lazy(() => import("../components/landing/Faq"));
const FinalCta = lazy(() => import("../components/landing/FinalCta"));
const Footer = lazy(() => import("../components/landing/Footer"));

export default function Landing() {
  const { showIntro } = useIntro();

  return (
    <div className="landing">
      <Grain />
      <ScrollProgress />
      <Intro visible={showIntro} />
      <LandingHeader />

      <main className="landing-main">
        <Hero start={!showIntro} />
        <Marquee />

        <Suspense fallback={<SectionSkeleton height={720} label="COLLECTION" />}>
          <TileCollection />
        </Suspense>

        <Suspense
          fallback={<SectionSkeleton height={640} label="HOW IT WORKS" />}
        >
          <ExplodedStack />
        </Suspense>

        <Suspense fallback={<SectionSkeleton height={480} label="QUESTIONS" />}>
          <Faq />
        </Suspense>

        <Suspense fallback={<SectionSkeleton height={420} />}>
          <FinalCta />
        </Suspense>
      </main>

      <Suspense fallback={<SectionSkeleton height={96} />}>
        <Footer />
      </Suspense>
    </div>
  );
}
