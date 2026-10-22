import type { Metadata } from 'next';
import { CtaSection } from '@/components/landing/cta-section';
import {
  ConnectSection,
  CreatorsSection,
  FansSection,
  LoopSection,
  ProblemSection,
} from '@/components/landing/deferred-sections';
import { Faq } from '@/components/landing/faq';
import { Hero } from '@/components/landing/hero';
import { ShowcaseStrip } from '@/components/landing/showcase-strip';
import { TrustSection } from '@/components/landing/trust-section';
import { JsonLd } from '@/components/shared/json-ld';
import { SITE } from '@/lib/constants';
import { organizationJsonLd, pageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...pageMetadata({
    title: `${SITE.name}: ${SITE.tagline}`,
    description: SITE.description,
    path: '/',
  }),
  title: { absolute: `${SITE.name}: ${SITE.tagline}` },
};

// Section order (round 4): hero, problem, how it works, for creators, for fans, connect, showcase, trust,
// FAQ, then the closing CTA last, directly above the footer. The CTA lives here, never in the shared layout.
export default function LandingPage() {
  return (
    <main id="main">
      <JsonLd data={organizationJsonLd()} />
      <Hero />
      <ProblemSection />
      <LoopSection />
      <CreatorsSection />
      <FansSection />
      <ConnectSection />
      <ShowcaseStrip />
      <TrustSection />
      <Faq />
      <CtaSection />
    </main>
  );
}
