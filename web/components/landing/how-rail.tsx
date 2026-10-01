'use client';

import { useLenis } from 'lenis/react';
import type * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { easeOut, segment, useScrollScene } from '@/hooks/use-scroll-scene';
import { cn } from '@/lib/utils';
import styles from './how.module.css';
import { CLICKS, formatCount, PITCH } from './how-data';

/*
 * Scene controller for "How it works".
 *
 * - Rail (desktop 1024+ wide and 650+ tall, motion allowed): the section grows to 100svh plus the
 *   track's overflow; the stage pins and the track translates on X as you scroll, 1px for 1px. The
 *   outlined numbers drift a little slower than their panels, the progress line fills, steps 02
 *   and 03 scrub their mini UIs as they enter from the right, and a step dims as it leaves past the
 *   left edge (so the resting frame reads as 03 in focus, not 02 cut mid-word). Step 01 plays its
 *   join sequence once.
 * - Stack (phones, tablets, short windows, reduced motion, and before hydration): a vertical list.
 *   Each mini UI plays once when it comes into view; reduced motion keeps the finished state.
 *
 * Every per-frame write goes to the DOM through refs; React state only holds the mode.
 */

/** 650px tall takes in 1366 x 768 laptops; how.module.css scales the rail's em size to the height. */
const RAIL_QUERY = '(min-width: 1024px) and (min-height: 650px)';
const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';
/** Duration of each step's one-shot sequence (stack mode, and step 01 on the rail). */
const PLAY_MS = [2400, 1700, 1900];
/** How much slower than its panel an outlined number travels across the stage. */
const NUM_DRIFT = 0.08;
/**
 * A scrubbed sequence starts when its mini UI's left edge enters the stage and finishes when the mini
 * UI's right edge reaches this share of the stage width, so the whole climb happens in view.
 */
const SCRUB_END = 0.92;
/** A step leaving past the left edge dims by this much per share of its width already gone, down to LEAVE_MIN. */
const LEAVE_RATE = 1.8;
const LEAVE_MIN = 0.32;

type Mode = 'stack' | 'rail';

interface Step {
  li: HTMLElement;
  num: HTMLElement | null;
  apply: (t: number) => void;
  /** Last value applied, so unchanged frames write nothing. */
  last: number;
  /** Opacity last written on the rail (panels dim as they leave past the left edge). */
  fade: number;
  played: boolean;
  raf: number;
  /** Offset and width inside the track, measured untransformed. */
  left: number;
  width: number;
  /** The same for the step's mini UI ([data-how-watch]), which drives its scrub. */
  watch: HTMLElement | null;
  watchLeft: number;
  watchWidth: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function toggle(el: Element | null | undefined, on: boolean) {
  if (!el) return;
  if (on && !el.hasAttribute('data-on')) el.setAttribute('data-on', '');
  else if (!on && el.hasAttribute('data-on')) el.removeAttribute('data-on');
}

const fmt = (value: number) => formatCount(value);

/** Builds the 0..1 sequence for one step's mini UI from its data-how-* hooks. */
function makeApply(index: number, li: HTMLElement): (t: number) => void {
  if (index === 0) {
    const picks = Array.from(li.querySelectorAll('[data-how-tile="pick"]'));
    const digits = Array.from(li.querySelectorAll('[data-how-digit]'));
    const code = li.querySelector('[data-how-code]');
    const verified = li.querySelector('[data-how-verified]');
    return (t) => {
      picks.forEach((el, k) => {
        toggle(el, t >= 0.08 + k * 0.16);
      });
      digits.forEach((el, k) => {
        toggle(el, t >= 0.44 + k * 0.07);
      });
      toggle(code, t >= 0.92);
      toggle(verified, t >= 0.92);
    };
  }
  if (index === 1) {
    const mark = li.querySelector<HTMLElement>('[data-how-mark]');
    const wire = li.querySelector<HTMLElement>('[data-how-wire]');
    const fit = li.querySelector<HTMLElement>('[data-how-fit]');
    const bar = li.querySelector<HTMLElement>('[data-how-fitbar]');
    const late = Array.from(li.querySelectorAll<HTMLElement>('[data-how-late]'));
    return (t) => {
      const a = easeOut(segment(t, 0, 0.32));
      const b = segment(t, 0.28, 0.46);
      const c = easeOut(segment(t, 0.42, 0.82));
      const d = easeOut(segment(t, 0.72, 1));
      if (mark) mark.style.transform = `scaleX(${a.toFixed(3)})`;
      if (wire) wire.style.transform = `scaleY(${b.toFixed(3)})`;
      if (fit) fit.textContent = String(Math.round(PITCH.fit * c));
      if (bar) bar.style.transform = `scaleX(${((PITCH.fit / 100) * c).toFixed(3)})`;
      for (const el of late) {
        el.style.opacity = d.toFixed(3);
        el.style.transform = `translate3d(0, ${((1 - d) * 6).toFixed(2)}px, 0)`;
      }
    };
  }
  const count = li.querySelector<HTMLElement>('[data-how-count]');
  const bars = Array.from(li.querySelectorAll<HTMLElement>('[data-how-bar]'));
  return (t) => {
    // A softer ease than the bars, so the count is still climbing while the disc is in view.
    const climb = 1 - (1 - segment(t, 0.08, 1)) ** 2;
    if (count) count.textContent = fmt(Math.round(CLICKS * climb));
    bars.forEach((el, k) => {
      const v = easeOut(segment(t, 0.06 + k * 0.07, 0.42 + k * 0.07));
      el.style.transform = `scaleY(${v.toFixed(3)})`;
    });
  };
}

function setStep(step: Step, t: number) {
  if (Math.abs(t - step.last) < 0.0005) return;
  step.last = t;
  step.apply(t);
}

export function HowRail({
  labelledBy,
  steps,
  children,
}: {
  labelledBy: string;
  steps: readonly { n: string; title: string }[];
  children: React.ReactNode;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [mode, setMode] = useState<Mode | null>(null);
  const scene = useRef({
    mode: null as Mode | null,
    overflow: 0,
    x: 0,
    active: -1,
    steps: [] as Step[],
  });

  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  /* Mode: rail only on roomy screens with motion allowed. */
  useEffect(() => {
    const rail = window.matchMedia(RAIL_QUERY);
    const reduce = window.matchMedia(REDUCE_QUERY);
    const update = () => setMode(rail.matches && !reduce.matches ? 'rail' : 'stack');
    update();
    rail.addEventListener('change', update);
    reduce.addEventListener('change', update);
    return () => {
      rail.removeEventListener('change', update);
      reduce.removeEventListener('change', update);
    };
  }, []);

  /* The three steps and their sequences, collected once. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    scene.current.steps = Array.from(root.querySelectorAll<HTMLElement>('[data-how-step]')).map(
      (li, index) => ({
        li,
        num: li.querySelector<HTMLElement>('[data-how-num]'),
        apply: makeApply(index, li),
        last: 1,
        fade: 1,
        played: false,
        raf: 0,
        left: 0,
        width: 0,
        watch: li.querySelector<HTMLElement>('[data-how-watch]'),
        watchLeft: 0,
        watchWidth: 0,
      }),
    );
    return () => {
      for (const step of scene.current.steps) cancelAnimationFrame(step.raf);
    };
  }, []);

  const setActive = useCallback((index: number) => {
    const s = scene.current;
    if (index === s.active) return;
    s.active = index;
    labelRefs.current.forEach((button, i) => {
      if (!button) return;
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }, []);

  /** One rail frame: translate the track, drift the numbers, fill the line, scrub 02 and 03. */
  const renderRail = useCallback(
    (progress: number, vw: number) => {
      const s = scene.current;
      const track = trackRef.current;
      if (s.mode !== 'rail' || !track) return;
      const x = -progress * s.overflow;
      s.x = x;
      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
      let best = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      s.steps.forEach((step, index) => {
        const left = step.left + x;
        const center = left + step.width / 2;
        const distance = Math.abs(center - vw / 2);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = index;
        }
        if (step.num) {
          step.num.style.transform = `translate3d(${((vw / 2 - center) * NUM_DRIFT).toFixed(1)}px, 0, 0)`;
        }
        const hidden = Math.max(0, -left) / Math.max(1, step.width);
        const fade = Math.round(Math.max(LEAVE_MIN, 1 - hidden * LEAVE_RATE) * 100) / 100;
        if (fade !== step.fade) {
          step.fade = fade;
          // The whole step dims as one group, so the number never shows through its panel. Its
          // one-time reveal is long over by now; its transition must not lag the scroll.
          step.li.style.transition = 'none';
          step.li.style.opacity = fade === 1 ? '' : String(fade);
        }
        if (index > 0) {
          const watchLeft = step.watchLeft + x;
          const span = step.watchWidth + vw * (1 - SCRUB_END);
          setStep(step, progress > 0.995 ? 1 : clamp01((vw - watchLeft) / span));
        }
      });
      setActive(best);
    },
    [setActive],
  );

  useScrollScene(rootRef, (frame) => renderRail(frame.progress, frame.width), 'pin');

  /** Scrolls the page so step `index` sits in the middle of the rail. */
  const scrollToStep = useCallback((index: number) => {
    const s = scene.current;
    const root = rootRef.current;
    const step = s.steps[index];
    if (s.mode !== 'rail' || !root || !step) return;
    const distance = root.offsetHeight - window.innerHeight;
    if (distance <= 0 || s.overflow <= 0) return;
    const target = clamp01((step.left + step.width / 2 - window.innerWidth / 2) / s.overflow);
    const top = root.getBoundingClientRect().top + window.scrollY + target * distance;
    if (lenisRef.current) lenisRef.current.scrollTo(top, { duration: 1.1 });
    else window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  /* Everything that depends on the mode: measuring, one-shot plays, reveals, focus. */
  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!mode || !root || !track) return;
    const s = scene.current;
    s.mode = mode;
    const reduced = window.matchMedia(REDUCE_QUERY).matches;
    const cleanups: Array<() => void> = [];

    // Leaving the rail: drop its geometry and finish anything it was scrubbing.
    if (mode === 'stack') {
      root.style.height = '';
      track.style.transform = '';
      s.steps.forEach((step, index) => {
        if (step.num) step.num.style.transform = '';
        step.li.style.opacity = '';
        step.li.style.transition = '';
        step.fade = 1;
        // 02 and 03 were scrubbed by the rail: show them finished unless they never started.
        if (index > 0 && (step.played || (step.last > 0 && step.last < 1))) {
          step.played = true;
          setStep(step, 1);
        }
      });
      setActive(-1);
    }

    if (mode === 'rail') {
      const stage = track.parentElement;
      const measure = () => {
        if (!stage) return;
        const trackRect = track.getBoundingClientRect();
        s.overflow = Math.max(0, track.offsetWidth - stage.clientWidth);
        root.style.height = `calc(100svh + ${Math.round(s.overflow)}px)`;
        for (const step of s.steps) {
          const rect = step.li.getBoundingClientRect();
          step.left = rect.left - trackRect.left;
          step.width = rect.width;
          const watch = step.watch?.getBoundingClientRect();
          step.watchLeft = watch ? watch.left - trackRect.left : step.left;
          step.watchWidth = watch ? watch.width : step.width;
        }
        const distance = root.offsetHeight - window.innerHeight;
        const progress = distance > 0 ? clamp01(-root.getBoundingClientRect().top / distance) : 0;
        renderRail(progress, window.innerWidth);
      };
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(track);
      if (stage) observer.observe(stage);
      document.fonts?.ready.then(measure).catch(() => {});
      cleanups.push(() => {
        observer.disconnect();
        root.style.height = '';
        track.style.transform = '';
        for (const step of s.steps) {
          step.li.style.opacity = '';
          step.li.style.transition = '';
          step.fade = 1;
        }
      });

      // Keyboard: focusing something inside an off-screen panel scrolls the rail to it.
      const onFocus = (event: FocusEvent) => {
        const li = (event.target as Element | null)?.closest?.('[data-how-step]');
        const index = s.steps.findIndex((step) => step.li === li);
        const step = s.steps[index];
        if (!step) return;
        const left = step.left + s.x;
        if (left >= 0 && left + step.width <= window.innerWidth) return;
        scrollToStep(index);
      };
      root.addEventListener('focusin', onFocus);
      cleanups.push(() => root.removeEventListener('focusin', onFocus));
    }

    if (!reduced) {
      const viewH = window.innerHeight;
      const viewW = window.innerWidth;
      const isVisible = (el: Element) => {
        const r = el.getBoundingClientRect();
        return r.top < viewH && r.bottom > 0 && r.left < viewW && r.right > 0;
      };

      // One-shot sequences: step 01 on the rail, all three in the stack. Rewind only what is
      // still out of view, so nothing on screen ever jumps back.
      const timed = mode === 'rail' ? [0] : [0, 1, 2];
      const play = (step: Step, index: number) => {
        if (step.played) return;
        step.played = true;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / (PLAY_MS[index] ?? 2000));
          setStep(step, t);
          step.raf = t < 1 ? requestAnimationFrame(tick) : 0;
        };
        step.raf = requestAnimationFrame(tick);
      };
      // A mode change mid-play finishes the sequence instead of freezing it halfway.
      cleanups.push(() => {
        for (const step of s.steps) {
          if (!step.raf) continue;
          cancelAnimationFrame(step.raf);
          step.raf = 0;
          setStep(step, 1);
        }
      });
      const watched = new Map<Element, number>();
      for (const index of timed) {
        const step = s.steps[index];
        if (!step || step.played) continue;
        const target = step.li.querySelector('[data-how-watch]') ?? step.li;
        if (isVisible(target)) {
          step.played = true;
          setStep(step, 1);
          continue;
        }
        setStep(step, 0);
        watched.set(target, index);
      }
      if (watched.size > 0) {
        const io = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              const index = watched.get(entry.target);
              const step = index === undefined ? undefined : s.steps[index];
              if (step && index !== undefined) play(step, index);
              io.unobserve(entry.target);
            }
          },
          { threshold: 0.45 },
        );
        for (const target of watched.keys()) io.observe(target);
        cleanups.push(() => io.disconnect());
      }

      // Reveals (fade and rise 16px): only what is below the fold and on the stage now.
      const pending = Array.from(root.querySelectorAll<HTMLElement>('[data-how-reveal]')).filter(
        (el) => {
          if (el.dataset.reveal === 'shown') return false;
          const r = el.getBoundingClientRect();
          return r.top > viewH && r.left < viewW;
        },
      );
      if (pending.length > 0) {
        for (const el of pending) el.dataset.reveal = 'pending';
        const io = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              (entry.target as HTMLElement).dataset.reveal = 'shown';
              io.unobserve(entry.target);
            }
          },
          { rootMargin: '0px 0px -10% 0px' },
        );
        for (const el of pending) io.observe(el);
        cleanups.push(() => {
          io.disconnect();
          for (const el of pending) el.dataset.reveal = 'shown';
        });
      }
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [mode, renderRail, scrollToStep, setActive]);

  return (
    <section
      ref={rootRef}
      id="how-it-works"
      aria-labelledby={labelledBy}
      className={styles.section}
      data-mode={mode ?? undefined}
    >
      <div className={styles.stage}>
        <div ref={trackRef} className={styles.track}>
          {children}
        </div>

        <nav className={styles.progress} aria-label="How it works steps">
          <span className={styles.progressLine} aria-hidden="true">
            <span ref={fillRef} className={styles.progressFill} />
          </span>
          <ol className={styles.progressSteps}>
            {steps.map((step, index) => (
              <li key={step.n}>
                <button
                  ref={(el) => {
                    labelRefs.current[index] = el;
                  }}
                  type="button"
                  className={styles.progressStep}
                  onClick={() => scrollToStep(index)}
                >
                  <span className={cn(styles.progressNum, 'tabular')}>{step.n}</span>
                  {step.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </section>
  );
}
