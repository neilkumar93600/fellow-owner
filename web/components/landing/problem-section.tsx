import { Funnel, Sparkles } from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/lib/utils';
import styles from './problem.module.css';
import {
  avatarTint,
  COUNTS,
  initials,
  PICK_ORDER,
  PICK_SET,
  PILE,
  type ProblemMessage,
  problemMessages,
  ROW_ORDER,
  typeLabel,
} from './problem-data';
import { ProblemMotion } from './problem-motion';

/**
 * The problem (landing brief v2, part 3): a pile of DMs sorts itself as you scroll. Spam slides into a
 * Filtered tray, the rest snaps into an inbox table, and the three best fits rise with their reasons.
 *
 * Everything here is server-rendered as the finished, sorted state, so it reads without JavaScript and with
 * reduced motion. The ProblemMotion island pins the stage and scrubs the scene through refs.
 */
export function ProblemSection() {
  return (
    <section id="problem" aria-labelledby="problem-title" className={styles.section}>
      <div className={styles.stage} data-problem="stage">
        <div className={styles.inner} data-problem="inner">
          <div className={styles.head}>
            <p className={styles.counter} data-problem="counter">
              <span className={styles.demoChip}>Demo</span>
              <span className={styles.counterDot} aria-hidden="true" />
              <span>
                <Wide>{COUNTS.wide.total}</Wide>
                <Phone>{COUNTS.phone.total}</Phone> new messages
              </span>
            </p>
            <h2
              id="problem-title"
              className={cn('text-section', styles.title)}
              data-problem="title"
            >
              <span className={styles.titleLine}>Thousands of DMs.</span>{' '}
              <span className={styles.titleLine}>Five that matter.</span>
            </h2>
            <p className={cn('text-lead', styles.lead)} data-problem="lead">
              Collab offers, investors and real talent sit in the same pile as spam and fan mail.
              Your AI sorts it, and tells you why.
            </p>
          </div>

          <div className={styles.final}>
            <div className={styles.slot} data-problem="slot" aria-hidden="true" />

            {/* Narration for the pinned scene only; it describes the motion, so assistive tech skips it. */}
            <div className={styles.narr} aria-hidden="true">
              <p data-problem="narr">
                Spam and bot offers go to Filtered. Everything else lands in one inbox, summarized.
              </p>
              <p data-problem="narr">
                The three best fits rise to the top, each with a one-line reason.
              </p>
            </div>

            <p className={styles.closing}>
              <span className={styles.closingLine} data-problem="closing">
                <Wide>{COUNTS.wide.total}</Wide>
                <Phone>{COUNTS.phone.total}</Phone> messages in.
              </span>{' '}
              <span className={styles.closingLine} data-problem="closing">
                <mark className={styles.mark}>3 worth your time.</mark>
              </span>{' '}
              <span className={styles.closingLine} data-problem="closing">
                <Wide>{COUNTS.wide.filtered}</Wide>
                <Phone>{COUNTS.phone.filtered}</Phone> filtered.
              </span>
            </p>

            <div className={styles.board} data-problem="board">
              <div className={styles.picksWrap} data-problem="picks-wrap">
                <div className={styles.picksField} data-problem="picks-field" aria-hidden="true" />
                <div className={styles.picksHead} data-problem="picks-head">
                  <p id="problem-picks" className={styles.picksLabel}>
                    Worth your time
                  </p>
                  {/* Counts up as the picks land; the list itself tells assistive tech how many. */}
                  <span
                    className={cn(styles.picksCount, 'tabular')}
                    data-problem="picks-count"
                    aria-hidden="true"
                  >
                    {PICK_ORDER.length}
                  </span>
                </div>
                <ol className={styles.picks} aria-labelledby="problem-picks">
                  {PICK_ORDER.map((id) => (
                    <PickCard key={id} message={problemMessages[id]!} />
                  ))}
                </ol>
              </div>

              <div className={styles.tableCard} data-problem="table">
                <span
                  className={styles.tableSurface}
                  data-problem="table-surface"
                  aria-hidden="true"
                />
                <div className={styles.tableTop}>
                  <p className={styles.tableTitle}>Mira’s inbox</p>
                  <span className={styles.demoChip}>Demo</span>
                  <p className={styles.tableSort}>Newest first</p>
                </div>
                <table className={styles.table}>
                  <caption className="sr-only">Demo inbox, newest first</caption>
                  <thead className={styles.thead}>
                    <tr className={styles.headRow}>
                      <th scope="col">From</th>
                      <th scope="col">Type</th>
                      <th scope="col">AI summary</th>
                      <th scope="col">Fit</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody className={styles.tbody}>
                    {ROW_ORDER.map((id) => (
                      <InboxRow key={id} message={problemMessages[id]!} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.boardFade} data-problem="board-fade" aria-hidden="true" />
            </div>

            <div className={styles.tray} data-problem="tray">
              <span className={styles.trayIcon} data-problem="tray-icon" aria-hidden="true">
                <Funnel size={18} strokeWidth={1.5} />
              </span>
              <span className={styles.trayText}>
                <span className={styles.trayLabel}>Filtered</span>
                <span className={styles.traySub}>Spam, held back</span>
                <span className="sr-only">
                  , <Wide>{COUNTS.wide.filtered}</Wide>
                  <Phone>{COUNTS.phone.filtered}</Phone> messages
                </span>
              </span>
              {/* Counts up as spam lands in the pinned scene; the final count is in the text above. */}
              <span className={cn(styles.trayCount, 'tabular')} aria-hidden="true">
                <Wide data-problem="count" data-final={COUNTS.wide.filtered}>
                  {COUNTS.wide.filtered}
                </Wide>
                <Phone data-problem="count" data-final={COUNTS.phone.filtered}>
                  {COUNTS.phone.filtered}
                </Phone>
              </span>
            </div>
          </div>

          <div className={styles.pile} aria-hidden="true">
            {PILE.map((slot, index) => (
              <Bubble key={slot.id} message={problemMessages[slot.id]!} index={index} />
            ))}
          </div>
        </div>
      </div>
      <ProblemMotion />
    </section>
  );
}

function Wide({ children, ...rest }: React.ComponentProps<'span'>) {
  return (
    <span className={styles.wideOnly} {...rest}>
      {children}
    </span>
  );
}

function Phone({ children, ...rest }: React.ComponentProps<'span'>) {
  return (
    <span className={styles.phoneOnly} {...rest}>
      {children}
    </span>
  );
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(styles.avatar, size === 'sm' && styles.avatarSm)}
      style={{ backgroundColor: avatarTint(name) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

/** Fit pill (04 §5): number plus a tiny bar, banded 0-39 / 40-69 / 70-100. */
function FitPill({ fit }: { fit: number }) {
  const band = fit >= 70 ? styles.fitHigh : fit >= 40 ? styles.fitMid : styles.fitLow;
  return (
    <span className={cn(styles.fit, band)}>
      <span className="sr-only">Fit </span>
      <span className="tabular">{fit}</span>
      <span className={styles.fitBar} aria-hidden="true">
        <span style={{ width: `${fit}%` }} />
      </span>
    </span>
  );
}

function InboxRow({ message }: { message: ProblemMessage }) {
  return (
    <tr
      className={cn(styles.row, message.wideOnly && styles.wideRow)}
      data-row={message.id}
      data-pick-row={PICK_SET.has(message.id) || undefined}
    >
      <td className={styles.cFrom}>
        <Avatar name={message.from} size="sm" />
        <span className={styles.cName}>{message.from}</span>
      </td>
      <td className={styles.cType}>{typeLabel(message)}</td>
      <td className={styles.cSum}>{message.summary}</td>
      <td className={styles.cFit}>{message.fit !== null ? <FitPill fit={message.fit} /> : null}</td>
      <td className={styles.cStatus}>
        <span className={styles.status}>New</span>
      </td>
    </tr>
  );
}

function PickCard({ message }: { message: ProblemMessage }) {
  return (
    <li className={styles.pick} data-pick={message.id}>
      <span className={styles.pickShadow} data-pick-part="shadow" aria-hidden="true" />
      <div className={styles.pickBody} data-pick-part="body">
        <div className={styles.pickTop}>
          <span className={styles.aiChip} data-pick-part="chip">
            <Sparkles size={13} strokeWidth={1.5} aria-hidden="true" />
            AI pick
          </span>
          <p className={styles.pickFrom}>
            <span className={styles.pickName}>{message.from}</span>
            <span className={styles.pickType}>{typeLabel(message)}</span>
          </p>
          {message.fit !== null ? <FitPill fit={message.fit} /> : null}
        </div>
        <p className={styles.pickSum}>{message.summary}</p>
        {message.reason ? (
          <p className={styles.pickWhy} data-pick-part="why">
            {message.reason}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function Bubble({ message, index }: { message: ProblemMessage; index: number }) {
  // Deterministic drift per bubble: a few px and under a degree, 5 to 8s, out of phase.
  const style = {
    '--i': index,
    '--drift-x': `${((index * 37) % 9) - 4}px`,
    '--drift-y': `${((index * 23) % 11) - 5}px`,
    '--drift-r': `${(((index * 17) % 7) - 3) * 0.25}deg`,
    '--drift-dur': `${5 + ((index * 13) % 4)}s`,
    '--drift-delay': `${-((index * 7) % 5)}s`,
  } as React.CSSProperties;

  return (
    <div
      className={cn(styles.bubble, message.wideOnly && styles.wideBubble)}
      data-bubble={message.id}
      style={style}
    >
      <div className={styles.drift}>
        <div className={styles.card}>
          <div className={styles.bTop}>
            <Avatar name={message.from} />
            <span className={styles.bWho}>
              <span className={styles.bName}>{message.from}</span>
              <span className={styles.bMeta}>{message.meta}</span>
            </span>
            <span className={styles.bTag}>{message.tag}</span>
          </div>
          <p className={styles.bText}>{message.text}</p>
        </div>
      </div>
    </div>
  );
}
