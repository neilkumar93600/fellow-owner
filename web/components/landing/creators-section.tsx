import type * as React from 'react';
import { cn } from '@/lib/utils';
import styles from './creators.module.css';
import { STEPS } from './creators-data';
import { CreatorsScene, CreatorsSlot } from './creators-motion';
import { FanMailScreen, SpotlightScreen, TodayScreen } from './creators-panels';
import { StudioShot } from './creators-studio';

const SCREENS: Record<string, () => React.ReactNode> = {
  today: TodayScreen,
  fanmail: FanMailScreen,
  spotlight: SpotlightScreen,
};

/**
 * For creators (creator pivot spec §5, section 5): a frosted field. From 1024px the story sits in a sticky
 * column on the left. With motion allowed the right column pins too: the three real studio screens
 * wait as a deck in 3D depth and swap in place as you scroll, and the step for the screen in front
 * lights up. Phones and tablets stack each step over its screen, flat.
 *
 * Everything is server-rendered flat and complete (no JavaScript, reduced motion: the screens simply
 * follow each other beside the sticky story); the client islands in creators-motion.tsx only add the
 * pin, the swap, the parallax, the step highlight and the reveals.
 */
export function CreatorsSection() {
  return (
    <section id="creators" aria-labelledby="creators-title" className={styles.section}>
      <div className={styles.field}>
        {/* Decoration: the whole studio in one shot (icon rail, Today, pulse). The three zoomed screens
            below carry the meaning, so this is hidden from assistive tech and cannot take focus. */}
        <div className={styles.studio} aria-hidden="true" inert>
          <p className={styles.studioCaption}>
            An AI briefing that turns fan noise into five decisions
          </p>
          <StudioShot />
        </div>
        <CreatorsScene className={styles.inner}>
          <div className={styles.grid}>
            <div className={styles.aside}>
              <div className={styles.asideInner} data-creators-top>
                <p className={cn('eyebrow', styles.eyebrow)} data-creators-reveal>
                  For creators
                </p>
                <h2
                  id="creators-title"
                  className={cn('text-section', styles.title)}
                  data-creators-reveal
                >
                  Your morning,
                  <br /> sorted in minutes.
                </h2>
                <p className={cn('text-lead', styles.lead)} data-creators-reveal>
                  Open Today with a coffee. Your AI has already read everything, picked the cards
                  worth your time, and written down why.
                </p>

                <p className={styles.demoLabel} data-creators-reveal>
                  <span className={styles.demoChip}>Demo</span>A demo studio. Every name and number
                  is made up.
                </p>

                <ol className={styles.steps} data-creators-reveal>
                  {STEPS.map((step, index) => (
                    <li key={step.id} className={styles.step} data-creators-step>
                      <a href={`#${step.target}`} className={styles.stepLink}>
                        <span className={cn(styles.stepNum, 'tabular')} aria-hidden="true">
                          {index + 1}
                        </span>
                        <span className={styles.stepText}>
                          <span className={styles.stepTitle}>
                            {step.title}
                            <span className="sr-only">:</span>
                          </span>
                          <span className={styles.stepDetail}>{step.detail}</span>
                          <span className={styles.stepBar} aria-hidden="true">
                            <span data-step-fill />
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className={styles.track}>
              <div className={styles.deck} data-creators-deck>
                {STEPS.map((step, index) => {
                  const Screen = SCREENS[step.id]!;
                  return (
                    <CreatorsSlot
                      key={step.id}
                      index={index}
                      id={step.target}
                      className={styles.slot}
                      tiltClassName={styles.tilt}
                    >
                      <figure className={styles.figure} aria-labelledby={`${step.target}-caption`}>
                        <figcaption id={`${step.target}-caption`} className={styles.caption}>
                          <span className={cn(styles.stepNum, 'tabular')} aria-hidden="true">
                            {index + 1}
                          </span>
                          <span className={styles.stepText}>
                            <span className={styles.stepTitle}>
                              {step.title}
                              <span className="sr-only">:</span>
                            </span>
                            <span className={styles.stepDetail}>{step.detail}</span>
                          </span>
                        </figcaption>
                        <div className={styles.shell}>
                          <Screen />
                        </div>
                      </figure>
                    </CreatorsSlot>
                  );
                })}
              </div>
            </div>
          </div>
        </CreatorsScene>
      </div>
    </section>
  );
}
