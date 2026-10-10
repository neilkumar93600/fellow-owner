import { EyeOff, HandHelping, Heart, ListChecks, type LucideIcon } from 'lucide-react';
import type * as React from 'react';
import { MatchLabel } from '@/components/shared/match-label';
import { cn } from '@/lib/utils';
import { DEMO } from './demo-data';
import { RevealGroup, RevealItem } from './reveal';
import { SectionHeading } from './section-heading';
import styles from './trust.module.css';

/**
 * You stay in charge (round 4 spec section 2, "Trust"): three plain statements about what the AI will
 * never do, each with an icon and a small picture of the real UI. The pictures are decoration
 * (aria-hidden): the title and line carry the meaning. Static, server-rendered, readable without
 * JavaScript. Names and numbers come from DEMO.
 */

type Statement = {
  Icon: LucideIcon;
  title: string;
  line: string;
  snippet: React.ReactNode;
};

const STATEMENTS: Statement[] = [
  {
    Icon: HandHelping,
    title: 'The AI never acts on its own',
    line: 'It drafts, ranks and explains. Nothing reaches a fan until you click send.',
    snippet: (
      <>
        <p className={styles.snipLabel}>Draft waiting for you</p>
        <p className={styles.draft}>“Yes! Send me the dates and I’ll block them out.”</p>
        <p className={styles.row}>
          <span className={styles.sendBtn}>Send</span>
          <span className={styles.muted}>Not sent yet</span>
        </p>
      </>
    ),
  },
  {
    Icon: EyeOff,
    title: 'Fans are never scored in public',
    line: 'Match labels and reasons are for your eyes only. Fans see names, work and hearts, never a ranking.',
    snippet: (
      <>
        <p className={styles.snipLabel}>What a fan sees</p>
        <p className={styles.snipTitle}>{DEMO.idea.title}</p>
        <p className={styles.muted}>
          {DEMO.idea.author} · {DEMO.idea.community}
        </p>
        <p className={styles.row}>
          <span className={styles.hearts}>
            <Heart size={14} strokeWidth={1.75} />
            <b className="tabular">{DEMO.idea.use}</b>
          </span>
          <span className={styles.muted}>No match label, no rank</span>
        </p>
      </>
    ),
  },
  {
    Icon: ListChecks,
    title: 'Every pick shows its reason',
    line: 'Each card says why it made the cut, in your own words, so you can check it and teach it.',
    snippet: (
      <>
        <p className={styles.row}>
          <span className={styles.snipTitle}>{DEMO.idea.title}</span>
        </p>
        <MatchLabel score={DEMO.idea.fit} className="self-start" />
        <p className={styles.why}>
          <b>Why:</b> {DEMO.idea.reason}
        </p>
      </>
    ),
  },
];

export function TrustSection() {
  return (
    <section id="trust" aria-labelledby="trust-title" className={styles.section}>
      <div className={styles.inner}>
        <SectionHeading
          id="trust-title"
          eyebrow="You stay in charge"
          title="Your voice. Your call."
          lead="The AI is your assistant, not your stand-in."
        />
        <RevealGroup as="ul" className={styles.grid}>
          {STATEMENTS.map(({ Icon, title, line, snippet }) => (
            <RevealItem as="li" key={title} className={cn('glass', styles.card)}>
              <span className={styles.icon} aria-hidden="true">
                <Icon size={22} strokeWidth={1.5} />
              </span>
              <h3 className={styles.title}>{title}</h3>
              <p className={styles.line}>{line}</p>
              <div className={styles.snippet} aria-hidden="true">
                {snippet}
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
