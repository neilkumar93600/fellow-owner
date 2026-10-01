import type * as React from 'react';
import { cn } from '@/lib/utils';
import styles from './how.module.css';
import { HOW_HEADING, HOW_STEPS } from './how-data';
import { BriefVisual, ClicksDisc, DraftCard, ShareVisual } from './how-panels';
import { HowRail } from './how-rail';

/**
 * How it works (landing brief v2, part 7), on the page background.
 *
 * Desktop: a pinned horizontal rail. The heading opens the track, then three step panels of different
 * shapes and tints (a wide white card, a lavender dome, a lime card with a round end) slide past under
 * huge outlined numbers, with a thin progress line below. Phones, tablets, short windows and reduced
 * motion get the same content as a vertical stack.
 *
 * All copy and every mini UI are server-rendered complete; how-rail.tsx only adds the motion.
 */
export function HowItWorks() {
  const [share, brief, back] = HOW_STEPS;
  return (
    <HowRail labelledBy="how-title" steps={HOW_STEPS}>
      <header className={styles.intro}>
        <p className={cn('eyebrow', styles.eyebrow)} data-how-reveal>
          {HOW_HEADING.eyebrow}
        </p>
        <h2 id="how-title" className={styles.title} data-how-reveal style={{ '--i': 1 } as Style}>
          {HOW_HEADING.titleLines[0]}
          <br />
          {HOW_HEADING.titleLines[1]}
        </h2>
        <p className={styles.lead} data-how-reveal style={{ '--i': 2 } as Style}>
          {HOW_HEADING.lead}
        </p>
      </header>

      <ol className={styles.steps}>
        <li className={cn(styles.step, styles.s1)} data-how-step data-how-reveal>
          <span className={styles.num} data-how-num aria-hidden="true">
            {share.n}
          </span>
          <div className={cn(styles.panel, styles.p1)}>
            <div className={styles.copy}>
              <h3 id={`${share.id}-title`} className={styles.stepTitle}>
                {share.title}
              </h3>
              <p className={styles.stepBody}>{share.body}</p>
            </div>
            <ShareVisual />
          </div>
        </li>

        <li className={cn(styles.step, styles.s2)} data-how-step data-how-reveal>
          <span className={styles.num} data-how-num aria-hidden="true">
            {brief.n}
          </span>
          <div className={cn(styles.panel, styles.p2)}>
            <div className={styles.copy}>
              <h3 id={`${brief.id}-title`} className={styles.stepTitle}>
                {brief.title}
              </h3>
              <p className={styles.stepBody}>{brief.body}</p>
            </div>
            <BriefVisual />
          </div>
        </li>

        <li className={cn(styles.step, styles.s3)} data-how-step data-how-reveal>
          <span className={styles.num} data-how-num aria-hidden="true">
            {back.n}
          </span>
          <div className={cn(styles.panel, styles.p3)}>
            <div className={styles.copy}>
              <h3 id={`${back.id}-title`} className={styles.stepTitle}>
                {back.title}
              </h3>
              <p className={styles.stepBody}>{back.body}</p>
              <DraftCard />
            </div>
            <ClicksDisc />
          </div>
        </li>
      </ol>
    </HowRail>
  );
}

type Style = React.CSSProperties & Record<`--${string}`, number | string>;
