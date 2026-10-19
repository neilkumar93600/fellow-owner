'use client';

import { ArrowUp, Sparkles } from 'lucide-react';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import styles from './hero.module.css';
import { TWIN_CHAT, type TwinQuestion } from './hero-product-data';

/** Characters of the twin's answer, in typing order: the lead, then each pick's title and why. */
function answerLength(q: TwinQuestion) {
  return q.picks.reduce((sum, pick) => sum + pick.title.length + pick.why.length, q.lead.length);
}

/** `text` as typed so far: `n` characters into the answer, this text starting at `at`. The rest keeps its space. */
function Typed({ text, at, n }: { text: string; at: number; n: number }) {
  const k = Math.min(text.length, Math.max(0, n - at));
  if (k >= text.length) return text;
  return (
    <>
      {text.slice(0, k)}
      <span className={styles.ghost}>{text.slice(k)}</span>
    </>
  );
}

/** One conversation. `n` is how far the twin has typed (Infinity: all of it). */
function Answer({ q, n }: { q: TwinQuestion; n: number }) {
  let at = q.lead.length;
  return (
    <>
      <p className={styles.ask}>{q.question}</p>
      <p className={styles.from}>
        <span className={styles.fromDot} aria-hidden="true" />
        Your AI twin
      </p>
      {/* The typed copy is visual only; the sr-only copy below reads the whole answer at once. */}
      <div aria-hidden="true" className={styles.answer}>
        <p className={styles.lead}>
          <Typed text={q.lead} at={0} n={n} />
        </p>
        <ol className={styles.picks}>
          {q.picks.map((pick) => {
            const titleAt = at;
            const whyAt = titleAt + pick.title.length;
            at = whyAt + pick.why.length;
            return (
              <li key={pick.title} className={styles.pick} data-on={n > titleAt}>
                <span className={styles.pickTitle}>
                  {pick.tag ? <span className={styles.tag}>{pick.tag}</span> : null}
                  <Typed text={pick.title} at={titleAt} n={n} />
                </span>
                <span className={styles.pickWhy}>
                  <Typed text={pick.why} at={whyAt} n={n} />
                </span>
                <span className={styles.room}>{pick.room}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="sr-only">
        <p>{q.lead}</p>
        <ol>
          {q.picks.map((pick) => (
            <li key={pick.title}>
              {pick.tag ? `${pick.tag}: ` : ''}
              {pick.title}. {pick.why} From {pick.room}.
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}

/**
 * "Ask your AI twin": a demo chat in the hero. Three prewritten questions (the tabs under the panel, or
 * the send button, which asks the next one); the twin's answer types out, instantly under reduced
 * motion. All three answers share one grid cell, so the panel is as tall as the longest and never jumps.
 * Server render shows the first answer in full. Demo data: names are made up.
 */
export function TwinChat() {
  const id = useId();
  const [active, setActive] = useState(0);
  const [n, setN] = useState(Number.POSITIVE_INFINITY);
  const [asked, setAsked] = useState('');
  const first = useRef(true);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const next = TWIN_CHAT[(active + 1) % TWIN_CHAT.length] ?? TWIN_CHAT[0];

  useEffect(() => {
    const q = TWIN_CHAT[active];
    if (!q || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(Number.POSITIVE_INFINITY);
      return;
    }
    const total = answerLength(q);
    let typed = 0;
    let timer = 0;
    setN(0);
    // The first answer waits for the hero's entrance; a new question starts almost at once.
    const start = window.setTimeout(
      () => {
        timer = window.setInterval(() => {
          typed += 3;
          setN(typed);
          if (typed >= total) window.clearInterval(timer);
        }, 16);
      },
      first.current ? 1100 : 250,
    );
    first.current = false;
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [active]);

  const select = (index: number, focus = false) => {
    setActive(index);
    if (focus) tabs.current[index]?.focus();
  };

  const onTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = TWIN_CHAT.length - 1;
    const to =
      event.key === 'ArrowRight'
        ? active === last
          ? 0
          : active + 1
        : event.key === 'ArrowLeft'
          ? active === 0
            ? last
            : active - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (to === null) return;
    event.preventDefault();
    select(to, true);
  };

  return (
    <div className={styles.chat} data-hero-last>
      {/* Cross-document view transition into the auth panel; inline because CSS modules hash the name.
          Under 768px the chat is display:none, so the name is never captured there. */}
      <div className={cn('glass-strong', styles.panel)} style={{ viewTransitionName: 'fo-twin' }}>
        <div className={styles.panelHead}>
          <span className={styles.twinIcon} aria-hidden="true">
            <Sparkles size={15} strokeWidth={1.75} />
          </span>
          <p className={styles.panelTitle}>Ask your AI twin</p>
          <span className={styles.badge}>Demo</span>
        </div>

        <div className={styles.thread}>
          {TWIN_CHAT.map((q, index) => (
            <div
              key={q.id}
              id={`${id}-panel-${q.id}`}
              role="tabpanel"
              aria-labelledby={`${id}-tab-${q.id}`}
              tabIndex={index === active ? 0 : -1}
              className={styles.turn}
              data-active={index === active}
            >
              <Answer q={q} n={index === active ? n : Number.POSITIVE_INFINITY} />
            </div>
          ))}
        </div>

        <div className={styles.composer}>
          <p className={styles.composerText}>{next.question}</p>
          <button
            type="button"
            className={styles.send}
            aria-label={`Ask: ${next.question}`}
            onClick={() => {
              const to = (active + 1) % TWIN_CHAT.length;
              setActive(to);
              setAsked(`Asked: ${TWIN_CHAT[to]?.question ?? ''}`);
            }}
          >
            <ArrowUp size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <p className={styles.panelFoot}>Reads like you. Never speaks for you.</p>
        <p aria-live="polite" className="sr-only">
          {asked}
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Questions for your AI twin"
        className={cn('glass', styles.tabs)}
        onKeyDown={onTabKey}
      >
        {TWIN_CHAT.map((q, index) => (
          <button
            key={q.id}
            ref={(el) => {
              tabs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${q.id}`}
            aria-selected={index === active}
            aria-controls={`${id}-panel-${q.id}`}
            tabIndex={index === active ? 0 : -1}
            className={styles.tab}
            onClick={() => select(index)}
          >
            {q.question}
          </button>
        ))}
      </div>

      <p className={styles.footnote}>Demo data. Names are made up.</p>
    </div>
  );
}
