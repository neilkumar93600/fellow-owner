import styles from './connect.module.css';
import { ConnectSteps } from './connect-steps';
import { SectionHeading } from './section-heading';

/**
 * New ways to connect: six numbered steps in one sideways row, each a short title, one line and a small
 * animated picture of the real UI (connect-visuals.tsx). On a wide screen the section pins and vertical
 * scroll drives the row; elsewhere the row swipes natively with snap points (connect-steps.tsx).
 * Names and numbers come from DEMO.
 */
export function ConnectSection() {
  return (
    <section id="connect" aria-labelledby="connect-title" className={styles.section}>
      <div className={styles.inner}>
        <SectionHeading
          id="connect-title"
          eyebrow="New ways to connect"
          title="Closer to your fans, in small moments."
        />
        <p className={styles.demoNote}>Demo data. Names are made up.</p>
      </div>
      <ConnectSteps />
    </section>
  );
}
