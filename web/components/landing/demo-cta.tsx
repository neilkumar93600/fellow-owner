import type * as React from 'react';
import { GetStartedButton } from '@/components/shared/get-started-button';
import { cn } from '@/lib/utils';
import st from './cta.module.css';
import { CtaStage } from './cta-motion';
import { CtaOrbit } from './cta-orbit';
import { DemoButton } from './demo-button';
import { DEMO } from './demo-data';

/*
 * Closing CTA, the landing's last section, directly above the footer: "Fans orbit + sunrise". Centered
 * headline and two buttons, fan avatars orbiting on two rings (cta-orbit.tsx, from 1024px), and a
 * golden-hour horizon glowing up from the bottom edge that fades into the footer. The Get started button
 * is the section's one rainbow (data-rainbow-cta tells the navbar to step back to glass while it shows).
 */

const STATS = [
  { value: DEMO.followers.label, label: 'followers' },
  { value: String(DEMO.rooms.length), label: 'rooms' },
  { value: DEMO.members.toLocaleString('en-US'), label: 'fans' },
] as const;

function delay(ms: number) {
  return { '--d': `${ms}ms` } as React.CSSProperties;
}

export function DemoCta() {
  return (
    <section id="demo" aria-labelledby="demo-title" className={st.section}>
      <CtaStage className={st.stage}>
        <div aria-hidden="true" className={st.sun} data-cta-reveal="sun">
          <div className={st.glow} />
          <div className={st.horizon} />
          <div className={st.grain} />
        </div>

        <CtaOrbit />

        <div className={st.content}>
          <p className={cn('eyebrow', st.rise)} data-cta-reveal="rise">
            Ready when you are
          </p>
          <h2
            id="demo-title"
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
            <GetStartedButton variant="rainbow" size="lg" data-rainbow-cta />
            <DemoButton as="creator" variant="secondary" className={st.demoBtn}>
              Try the live demo
            </DemoButton>
          </div>

          <div className={cn(st.statsWrap, st.rise)} data-cta-reveal="rise" style={delay(320)}>
            <ul className={st.stats}>
              {STATS.map((s) => (
                <li key={s.label} className={st.stat}>
                  <span className={cn(st.statValue, 'tabular')}>{s.value}</span>
                  <span className={st.statLabel}>{s.label}</span>
                </li>
              ))}
            </ul>
            <p className={st.note}>Demo numbers from {DEMO.creator.firstName}&rsquo;s space.</p>
          </div>
        </div>
      </CtaStage>
    </section>
  );
}
