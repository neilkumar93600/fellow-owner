import type * as React from 'react';
import { cn } from '@/lib/utils';
import { CtaStage } from './cta-motion';
import { DemoButton } from './demo-button';
import { faqs } from './demo-data';
import st from './faq.module.css';
import { FaqAccordion } from './faq-accordion';

/*
 * FAQ (landing brief v2, part 11), on the page background. Desktop: the title and a way into the demo
 * hold still on the left while the accordion scrolls on the right. Questions and answers are in the
 * server HTML (crawlable, and described again as FAQPage structured data). Without JavaScript the
 * noscript style opens every answer; the questions stay plain headings until the accordion hydrates.
 */

const FAQ_JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
}).replace(/</g, '\\u003c');

const NO_SCRIPT_CSS =
  '[data-faq-panel]{grid-template-rows:1fr!important;visibility:visible!important}' +
  '[data-faq-panel] p{opacity:1!important;transform:none!important}';

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className={st.section}>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static FAQ data from demo-data, with < escaped.
        dangerouslySetInnerHTML={{ __html: FAQ_JSON_LD }}
      />
      <noscript>
        <style>{NO_SCRIPT_CSS}</style>
      </noscript>

      <CtaStage className={st.inner}>
        <div className={st.aside} data-cta-reveal="rise">
          <h2 id="faq-title" className={cn('text-section', st.title)}>
            Questions, answered.
          </h2>
          <p className={st.note}>Still curious? Enter the demo and look around.</p>
          <DemoButton as="creator" className={st.noteAction} />
        </div>

        <div
          className={st.main}
          data-cta-reveal="rise"
          style={{ '--d': '100ms' } as React.CSSProperties}
        >
          <FaqAccordion items={faqs} />
        </div>
      </CtaStage>
    </section>
  );
}
