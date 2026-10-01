import type { Metadata } from 'next';
import { CreatorsSection } from '@/components/landing/creators-section';
import { DemoCta } from '@/components/landing/demo-cta';
import { FansSection } from '@/components/landing/fans-section';
import { Faq } from '@/components/landing/faq';
import { FeaturesGrid } from '@/components/landing/features-grid';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { LoopSection } from '@/components/landing/loop-section';
import { ProblemSection } from '@/components/landing/problem-section';
import { ShowcaseStrip } from '@/components/landing/showcase-strip';
import { SITE } from '@/lib/constants';

export const metadata: Metadata = {
  title: { absolute: `${SITE.name}: ${SITE.tagline}` },
  description: SITE.description,
};

// Story order from the confirmed landing brief v2: hero, problem, loop, creators, fans,
// how it works, features, showcase, demo CTA, FAQ (navbar and footer come from the layout).
export default function LandingPage() {
  return (
    <main id="main">
      <Hero />
      <ProblemSection />
      <LoopSection />
      <CreatorsSection />
      <FansSection />
      <HowItWorks />
      <FeaturesGrid />
      <ShowcaseStrip />
      <DemoCta />
      <Faq />
    </main>
  );
}
