import Link from 'next/link';
import type * as React from 'react';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import st from './cta.module.css';
import { CtaStage } from './cta-motion';
import { CtaOrbit } from './cta-orbit';
import pill from './pill.module.css';

/*
 * Closing CTA, the landing's last section, directly above the footer: "Fans orbit". Centered headline
 * and one button, fan avatars orbiting on two rings (cta-orbit.tsx, from 1280px), and two soft Monad
 * washes rising from the bottom edge that fade into the footer. Get started is the section's one Lake Blue
 * button (data-rainbow-cta, a legacy name, tells the navbar to step back to glass while it shows).
 */

const STATS = ['1 link', 'Rooms for every interest', 'About 10 minutes a day'] as const;

function delay(ms: number) {
  return { '--d': `${ms}ms` } as React.CSSProperties;
}

export function CtaSection() {
  return (
    <section id="get-started" aria-labelledby="cta-title" className={st.section}>
      <CtaStage className={st.stage}>
        <div aria-hidden="true" className={st.washes} data-cta-reveal="washes">
          <div className={st.washA} />
          <div className={st.washB} />
          <div className={cn('grain', st.grain)} />
        </div>

        <CtaOrbit />

        <div className={st.content}>
          <p className={cn('eyebrow', st.rise)} data-cta-reveal="rise">
            Ready when you are
          </p>
          <h2
            id="cta-title"
            className={cn(st.title, st.rise)}
            data-cta-reveal="rise"
            style={delay(80)}
          >
            <span className={st.ln}>Your fans are already here.</span>{' '}
            <span className={st.ln}>
              Give them <em>a room.</em>
            </span>
          </h2>
          <p
            className={cn('text-lead', st.lead, st.rise)}
            data-cta-reveal="rise"
            style={delay(160)}
          >
            One link in your bio. Rooms for every interest. Ten minutes a day to see what matters.
          </p>

          <div className={cn(st.actions, st.rise)} data-cta-reveal="rise" style={delay(240)}>
            <Link
              href={routes.start()}
              className={cn('btn btn-primary', pill.primary)}
              data-rainbow-cta
            >
              Get started
            </Link>
          </div>

          <div className={cn(st.statsWrap, st.rise)} data-cta-reveal="rise" style={delay(320)}>
            <ul className={cn(st.stats, 'flex-wrap gap-y-2')}>
              {STATS.map((s) => (
                <li key={s} className={cn(st.stat, 'max-sm:border-l-0!')}>
                  <span className={cn(st.statValue, 'text-base! sm:text-xl!')}>{s}</span>
                </li>
              ))}
            </ul>
            <p className={st.note}>
              Founding creators: we set it up with you and ship one change you ask for within 48
              hours.{' '}
              <Link href="/contact?topic=founding" className={cn('underline', st.apply)}>
                Apply
              </Link>
            </p>
          </div>
        </div>
      </CtaStage>
    </section>
  );
}
