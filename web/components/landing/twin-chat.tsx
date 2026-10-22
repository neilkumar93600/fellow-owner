'use client';

import { ArrowUp, Sparkles } from 'lucide-react';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import styles from './hero.module.css';
import { getIntroState, INTRO_PLAY_EVENT } from './hero-intro';
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
 * "Ask your AI twin": an example chat in the hero. Three prewritten questions (the tabs under the panel, or
 * the send button, which asks the next one); the twin's answer types out, instantly under reduced
 * motion. All three answers share one grid cell, so the panel is as tall as the longest and never jumps.
 * Server render shows the first answer in full. Example data: names are made up.
 */
export function TwinChat() {
  const id = useId();
  const [active, setActive] = useState(0);
  const [n, setN] = useState(Number.POSITIVE_INFINITY);
  const [asked, setAsked] = useState('');
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);
  const next = TWIN_CHAT[(active + 1) % TWIN_CHAT.length] ?? TWIN_CHAT[0];

  useEffect(() => {
    const q = TWIN_CHAT[active];
    // Reduced motion, or a phone where the chat is display:none: the full answer, no typing.
    if (
      !q ||
      window.matchMedia('(prefers-reduced-motion: reduce), (max-width: 767.98px)').matches
    ) {
      setN(Number.POSITIVE_INFINITY);
      return;
    }
    const total = answerLength(q);
    let typed = 0;
    let timer = 0;
    let start = 0;
    const type = (delay: number) => {
      window.clearTimeout(start);
      start = window.setTimeout(() => {
        timer = window.setInterval(() => {
          typed += 6;
          setN(typed);
          if (typed >= total) window.clearInterval(timer);
        }, 16);
      }, delay);
    };
    setN(0);
    // The first answer starts typing as the chat rises in (0.44s into the entrance), so it is done about
    // a second after fonts; a new question starts almost at once.
    // The intro's 5s failsafe ends it without a play event, so a pending start also gets a late fallback.
    const intro = getIntroState();
    const onPlay = () => type(440);
    if (intro.phase === 'pending') {
      window.addEventListener(INTRO_PLAY_EVENT, onPlay, { once: true });
      type(5200);
    } else if (intro.phase === 'playing') type(Math.max(0, intro.at + 440 - performance.now()));
    else type(250);
    return () => {
      window.removeEventListener(INTRO_PLAY_EVENT, onPlay);
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [active]);

  // Reduced motion hides inactive turns with display:none, so reserve the tallest turn's height on the
  // thread (measured with them briefly shown, before paint) and the panel never jumps between tabs.
  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const measure = () => {
      thread.style.removeProperty('--thread-min');
      thread.setAttribute('data-measure', '');
      const tallest = Math.max(
        ...Array.from(thread.children, (c) => (c as HTMLElement).offsetHeight),
      );
      thread.removeAttribute('data-measure');
      if (reduce.matches) thread.style.setProperty('--thread-min', `${tallest + 28}px`);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

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
          <span className={styles.badge}>Example</span>
        </div>

        <div ref={threadRef} className={styles.thread}>
          {TWIN_CHAT.map((q, index) => (
            <div
              key={q.id}
              id={`${id}-panel-${q.id}`}
              role="tabpanel"
              aria-labelledby={`${id}-tab-${q.id}`}
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

      <p className={styles.footnote}>Example data. Names are made up.</p>
    </div>
  );
}
