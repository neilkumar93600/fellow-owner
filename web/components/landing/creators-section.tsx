import type * as React from 'react';
import { cn } from '@/lib/utils';
import styles from './creators.module.css';
import { STEPS } from './creators-data';
import { CreatorsScene, CreatorsSlot } from './creators-motion';
import { BriefingScreen, InboxScreen, PromoteScreen } from './creators-panels';

const SCREENS: Record<string, () => React.ReactNode> = {
  briefing: BriefingScreen,
  inbox: InboxScreen,
  promote: PromoteScreen,
};

/**
 * For creators (landing brief v2, part 5): a lavender field. On desktop the story sits in a sticky
 * column while three real dashboard screens pass through in 3D on the right, and the step for the
 * screen in focus lights up. Phones and tablets stack each step over its screen, flat.
 *
 * Everything is server-rendered flat and complete (no JavaScript, reduced motion); the client islands in
 * creators-motion.tsx only add the tilt, the parallax, the step highlight and the reveals.
 */
export function CreatorsSection() {
  return (
    <section id="creators" aria-labelledby="creators-title" className={styles.section}>
      <div className={styles.field}>
        <CreatorsScene className={styles.inner}>
          <div className={styles.grid}>
            <div className={styles.aside}>
              <div className={styles.asideInner}>
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
                  Open Today with a coffee. Your AI has already read everything, ranked it against
                  your taste, and written down why.
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
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className={styles.track}>
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
        </CreatorsScene>
      </div>
    </section>
  );
}
