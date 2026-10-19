import type { Metadata } from 'next';
import { CreatorsSection } from '@/components/landing/creators-section';
import { DemoCta } from '@/components/landing/demo-cta';
import { FansSection } from '@/components/landing/fans-section';
import { Faq } from '@/components/landing/faq';
import { Hero } from '@/components/landing/hero';
import { ProblemSection } from '@/components/landing/problem-section';
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

// Section order (2026-10-19, leaner landing): hero, problem, for creators, for fans, FAQ, then the demo
// CTA last, directly above the footer. The CTA lives here, never in the shared layout.
export default function LandingPage() {
  return (
    <main id="main">
      <JsonLd data={organizationJsonLd()} />
      <Hero />
      <ProblemSection />
      <CreatorsSection />
      <FansSection />
      <Faq />
      <DemoCta />
    </main>
  );
}
