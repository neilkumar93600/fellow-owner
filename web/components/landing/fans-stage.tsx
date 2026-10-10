'use client';

import { useLenis } from 'lenis/react';
import { BatteryFull, Signal, Wifi } from 'lucide-react';
import type * as React from 'react';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { easeOut, lerp, segment, useScrollScene } from '@/hooks/use-scroll-scene';
import { cn } from '@/lib/utils';
import st from './fans.module.css';
import { FAN_INTRO, FAN_STEPS, STEP_STARTS } from './fans-data';

/**
 * The interactive half of "For fans": the step list and the 3D phone.
 *
 * Modes (data-mode on the root):
 *  - static: server markup and no-JS. Phones swipe the screens (CSS scroll snap); wider screens show screen 1.
 *  - pin: 768px and up with motion allowed. A sticky 100svh stage; scroll turns the phone and steps the screens.
 *  - tabs: 768px and up with reduced motion (or a very short window). Static phone; the steps switch screens.
 *  - swipe: under 768px. No pin; the screens are a snap row inside the phone, synced to the pager and the
 *    caption under it. With motion allowed the phone turns a little as it passes through the viewport,
 *    and the first time it comes into view the screens nudge sideways to show they swipe.
 *
 * React state changes only when the active step changes; everything per frame is written through refs.
 */

type Mode = 'static' | 'pin' | 'tabs' | 'swipe';

const STEP_COUNT = FAN_STEPS.length;

function stepEnd(index: number): number {
  return STEP_STARTS[index + 1] ?? 1;
}

function stepAt(progress: number): number {
  let index = 0;
  for (let i = 0; i < STEP_STARTS.length; i++) {
    if (progress >= STEP_STARTS[i]!) index = i;
  }
  return index;
}

export function FansStage({
  screens,
  label,
  callout,
}: {
  /** The four phone screens, in step order. */
  screens: React.ReactNode[];
  label: React.ReactNode;
  callout: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const deviceRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const lockRef = useRef(0);
  const [mode, setMode] = useState<Mode>('static');
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);
  const lenis = useLenis();

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const narrow = window.matchMedia('(max-width: 767.98px)');
    const roomy = window.matchMedia('(min-height: 600px)');
    const update = () => {
      setReduced(motion.matches);
      setMode(narrow.matches ? 'swipe' : !motion.matches && roomy.matches ? 'pin' : 'tabs');
    };
    update();
    for (const query of [motion, narrow, roomy]) query.addEventListener('change', update);
    return () => {
      for (const query of [motion, narrow, roomy]) query.removeEventListener('change', update);
    };
  }, []);

  const select = useCallback((index: number) => {
    if (activeRef.current === index) return;
    activeRef.current = index;
    setActive(index);
  }, []);

  // Swipe mode: the row's scroll position picks the step (one read per frame, state only on change).
  useEffect(() => {
    if (mode !== 'swipe') return;
    const row = rowRef.current;
    if (!row) return;
    row.scrollLeft = activeRef.current * row.clientWidth;
    let frame = 0;
    const sync = () => {
      frame = 0;
      if (performance.now() < lockRef.current || row.clientWidth === 0) return;
      const index = Math.round(row.scrollLeft / row.clientWidth);
      select(Math.min(STEP_COUNT - 1, Math.max(0, index)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(sync);
    };
    row.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      row.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [mode, select]);

  /** Page scroll position of step `index`'s moment in the pinned scene. */
  const sceneTarget = (index: number): number | null => {
    const scene = sceneRef.current;
    if (!scene) return null;
    const top = scene.getBoundingClientRect().top + window.scrollY;
    const distance = scene.offsetHeight - window.innerHeight;
    const start = STEP_STARTS[index] ?? 0;
    const at = index === 0 ? 0.02 : start + (stepEnd(index) - start) * 0.62;
    return top + distance * at;
  };

  const goTo = (index: number) => {
    if (mode === 'pin') {
      // Scroll the page to that step's moment in the scene; the scene then sets the step itself.
      const target = sceneTarget(index);
      if (target === null) return;
      if (lenis) lenis.scrollTo(target, { duration: 1.1 });
      else window.scrollTo({ top: target, behavior: 'smooth' });
      return;
    }
    if (mode === 'swipe' || mode === 'static') {
      const row = rowRef.current;
      if (row) {
        lockRef.current = performance.now() + (reduced ? 0 : 700);
        row.scrollTo({ left: index * row.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
      }
    }
    select(index);
  };

  /*
   * Pin mode, keyboard: a step button sits in the sticky stage, so the browser's own scroll-into-view
   * cannot reach it from outside the scene, and Lenis' smoothed scroll can undo it (Shift+Tab from the
   * next section left focus 700px above the viewport). Map focus to the step's moment in the scene,
   * as a click does: at once when the button is off-screen, smoothly when it is already in view.
   */
  const onStepFocus = (index: number, button: HTMLButtonElement) => {
    if (mode !== 'pin') return;
    requestAnimationFrame(() => {
      if (document.activeElement !== button || !button.matches(':focus-visible')) return;
      const target = sceneTarget(index);
      if (target === null) return;
      const rect = button.getBoundingClientRect();
      const offscreen = rect.bottom <= 0 || rect.top >= window.innerHeight;
      if (lenis) {
        lenis.scrollTo(target, offscreen ? { immediate: true, force: true } : { duration: 0.8 });
      } else {
        window.scrollTo({ top: target, behavior: offscreen ? 'instant' : 'smooth' });
      }
    });
  };

  return (
    <div ref={rootRef} className={st.root} data-mode={mode}>
      <div ref={sceneRef} className={st.scene}>
        <div className={st.stage}>
          <div className={st.label}>{label}</div>

          <ol className={st.steps} data-fans-steps>
            {FAN_STEPS.map((step, index) => {
              const state = index === active ? 'active' : index < active ? 'done' : 'upcoming';
              return (
                <li key={step.id} className={st.step} data-state={state}>
                  <span className={st.rule} aria-hidden="true">
                    <span className={st.fill} data-fans-fill />
                  </span>
                  <h3 className={st.stepHead}>
                    <button
                      type="button"
                      className={st.stepBtn}
                      aria-current={index === active ? 'step' : undefined}
                      tabIndex={mode === 'swipe' ? -1 : undefined}
                      onClick={() => goTo(index)}
                      onFocus={(event) => onStepFocus(index, event.currentTarget)}
                    >
                      <span className={cn(st.num, 'tabular')} aria-hidden="true">
                        {index + 1}
                      </span>
                      <span className={st.stepTitle}>{step.title}</span>
                    </button>
                  </h3>
                  <p className={st.stepLine}>{step.line}</p>
                </li>
              );
            })}
          </ol>

          <div ref={deviceRef} className={st.device} aria-hidden="true">
            <div className={st.disc} data-fans-disc />
            <div className={st.floor} data-fans-floor />
            <div className={st.phone} data-fans-phone>
              <span className={cn(st.key, st.keyAction)} />
              <span className={cn(st.key, st.keyUp)} />
              <span className={cn(st.key, st.keyDown)} />
              <span className={cn(st.key, st.keyPower)} />
              <div className={st.body}>
                <div className={st.screen}>
                  {/* Scrollable, so browsers would make it a tab stop; it is decorative (aria-hidden),
                      and the pager and the steps already drive it. */}
                  <div ref={rowRef} className={st.screens} tabIndex={-1}>
                    {screens.map((screen, index) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: four fixed screens in step order.
                        key={index}
                        className={st.slide}
                        data-pos={
                          index === active ? 'current' : index < active ? 'before' : 'after'
                        }
                      >
                        {screen}
                      </div>
                    ))}
                  </div>
                  <div className={st.status}>
                    <span className="tabular">9:41</span>
                    <span className={st.statusIcons}>
                      <Signal strokeWidth={2.25} />
                      <Wifi strokeWidth={2.25} />
                      <BatteryFull strokeWidth={1.75} />
                    </span>
                  </div>
                  <span className={st.island} />
                  <span className={st.home} />
                  <span className={st.glare} data-fans-glare />
                </div>
              </div>
            </div>
          </div>

          <div className={st.dots}>
            {FAN_STEPS.map((step, index) => (
              <button
                key={step.id}
                type="button"
                className={st.dot}
                aria-label={`Step ${index + 1}: ${step.title}`}
                aria-current={index === active ? 'step' : undefined}
                onClick={() => goTo(index)}
              />
            ))}
          </div>

          <div className={st.callout}>{callout}</div>
        </div>
      </div>
      {mode === 'pin' ? <PinDriver rootRef={rootRef} sceneRef={sceneRef} onStep={select} /> : null}
      {mode === 'swipe' && !reduced ? (
        <SwipeDriver deviceRef={deviceRef} rowRef={rowRef} activeRef={activeRef} />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ */

interface SceneEls {
  phone: HTMLElement | null;
  glare: HTMLElement | null;
  floor: HTMLElement | null;
  disc: HTMLElement | null;
  fills: HTMLElement[];
  typed: HTMLElement | null;
  count: HTMLElement | null;
  join: HTMLElement | null;
  feed: HTMLElement | null;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Pinned scene driver. Scene progress 0..1 maps to:
 *  - the active step (STEP_STARTS), pushed to React only when it changes;
 *  - the phone pose: rotateY -24deg at the start, 0 at the middle, +14deg at the end, a few degrees of
 *    rotateX and a soft vertical float; it also rises and turns in as the scene scrolls into view;
 *  - small story beats on the screens: the intro types itself, the AI suggests and preselects two
 *    communities, and "I'd use this" gets pressed.
 */
function PinDriver({
  rootRef,
  sceneRef,
  onStep,
}: {
  rootRef: RefObject<HTMLDivElement | null>;
  sceneRef: RefObject<HTMLDivElement | null>;
  onStep: (index: number) => void;
}) {
  const els = useRef<SceneEls | null>(null);
  const last = useRef({ fills: [] as number[], chars: -1, join: '', signal: '' });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = (selector: string) => root.querySelector<HTMLElement>(selector);
    const found: SceneEls = {
      phone: q('[data-fans-phone]'),
      glare: q('[data-fans-glare]'),
      floor: q('[data-fans-floor]'),
      disc: q('[data-fans-disc]'),
      fills: Array.from(root.querySelectorAll<HTMLElement>('[data-fans-fill]')),
      typed: q('[data-fans-typed]'),
      count: q('[data-fans-count]'),
      join: q('[data-fans-join]'),
      feed: q('[data-fans-feed]'),
    };
    els.current = found;
    last.current = { fills: [], chars: -1, join: '', signal: '' };
    return () => {
      // Leaving pin mode: hand the DOM back in its finished state.
      for (const el of [found.phone, found.glare, found.floor, found.disc, ...found.fills]) {
        if (el) {
          el.style.transform = '';
          el.style.opacity = '';
        }
      }
      if (found.typed) found.typed.textContent = FAN_INTRO;
      if (found.count) found.count.textContent = String(FAN_INTRO.length);
      found.join?.removeAttribute('data-state');
      found.feed?.removeAttribute('data-signal');
      els.current = null;
    };
  }, [rootRef]);

  useScrollScene(
    sceneRef,
    ({ progress: p, height }) => {
      const e = els.current;
      const scene = sceneRef.current;
      if (!e || !scene) return;

      const index = stepAt(p);
      onStep(index);

      // Rise in while the scene scrolls up to its pin (0 when its top meets the viewport bottom).
      const approach = easeOut(
        Math.min(1, Math.max(0, 1 - scene.getBoundingClientRect().top / height)),
      );
      const firstHalf = p < 0.5;
      const t = smooth(firstHalf ? p / 0.5 : (p - 0.5) / 0.5);
      const ry = (firstHalf ? lerp(-24, 0, t) : lerp(0, 14, t)) - (1 - approach) * 14;
      const rx = (firstHalf ? lerp(7, 3, t) : lerp(3, 5, t)) + (1 - approach) * 8;
      const rz = firstHalf ? lerp(-1.5, 0, t) : lerp(0, 1, t);
      const ty = (1 - approach) * 96 - Math.sin(p * Math.PI) * 10;

      if (e.phone) {
        e.phone.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
      }
      if (e.glare) e.glare.style.transform = `translate3d(${(ry * 1.6).toFixed(2)}%, 0, 0)`;
      if (e.floor) {
        e.floor.style.transform = `translate3d(${(ry * 1.1).toFixed(2)}px, ${(ty * 0.15).toFixed(2)}px, 0) scaleX(${(1 - Math.abs(ry) / 110).toFixed(3)})`;
        e.floor.style.opacity = approach.toFixed(3);
      }
      if (e.disc) {
        e.disc.style.transform = `scale(${(0.84 + 0.16 * approach + 0.03 * Math.sin(p * Math.PI)).toFixed(4)})`;
      }

      // Progress hairline above each step.
      e.fills.forEach((fill, i) => {
        const value = i < index ? 1 : i > index ? 0 : segment(p, STEP_STARTS[i] ?? 0, stepEnd(i));
        const rounded = Math.round(value * 1000) / 1000;
        if (last.current.fills[i] !== rounded) {
          last.current.fills[i] = rounded;
          fill.style.transform = `scaleX(${rounded})`;
        }
      });

      // Join: the intro types itself, then the AI suggests and preselects two communities.
      const join = segment(p, STEP_STARTS[0], STEP_STARTS[1]);
      const chars = Math.round(segment(join, 0, 0.45) * FAN_INTRO.length);
      if (chars !== last.current.chars) {
        last.current.chars = chars;
        if (e.typed) e.typed.textContent = FAN_INTRO.slice(0, chars);
        if (e.count) e.count.textContent = String(chars);
      }
      const joinState = join < 0.5 ? 'typing' : 'suggested';
      if (joinState !== last.current.join) {
        last.current.join = joinState;
        e.join?.setAttribute('data-state', joinState);
      }

      // Feed: "I'd use this" gets pressed halfway through the step.
      const feed = segment(p, STEP_STARTS[1], STEP_STARTS[2]);
      const signal = feed < 0.45 ? 'off' : 'on';
      if (signal !== last.current.signal) {
        last.current.signal = signal;
        e.feed?.setAttribute('data-signal', signal);
      }
    },
    'pin',
  );

  return null;
}

/* ------------------------------------------------------------------------------------------------ */

/**
 * Swipe mode (phones, motion allowed). The phone turns from -16deg to +8deg as it passes through the
 * viewport, and the first time it is well in view the screens nudge a sixth of the way to the next one
 * and settle back, so the row reads as swipeable. Unmounting hands the phone back to its CSS pose.
 */
function SwipeDriver({
  deviceRef,
  rowRef,
  activeRef,
}: {
  deviceRef: RefObject<HTMLDivElement | null>;
  rowRef: RefObject<HTMLDivElement | null>;
  activeRef: RefObject<number>;
}) {
  const els = useRef<{ phone: HTMLElement | null; glare: HTMLElement | null } | null>(null);

  useEffect(() => {
    const device = deviceRef.current;
    const row = rowRef.current;
    if (!device || !row) return;
    const found = {
      phone: device.querySelector<HTMLElement>('[data-fans-phone]'),
      glare: device.querySelector<HTMLElement>('[data-fans-glare]'),
    };
    els.current = found;

    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        // Only as a hint: never once the visitor has swiped or picked a step.
        if (row.scrollLeft > 0 || activeRef.current !== 0) return;
        row.setAttribute('data-nudge', '');
        timer = window.setTimeout(() => row.removeAttribute('data-nudge'), 1400);
      },
      { threshold: 0.7 },
    );
    observer.observe(device);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      row.removeAttribute('data-nudge');
      for (const el of [found.phone, found.glare]) if (el) el.style.transform = '';
      els.current = null;
    };
  }, [deviceRef, rowRef, activeRef]);

  useScrollScene(
    deviceRef,
    ({ progress }) => {
      const e = els.current;
      if (!e?.phone) return;
      const t = smooth(progress);
      const ry = lerp(-16, 8, t);
      const rx = lerp(7, 2, t);
      const rz = lerp(-1.5, 0.5, t);
      e.phone.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
      if (e.glare) e.glare.style.transform = `translate3d(${(ry * 1.6).toFixed(2)}%, 0, 0)`;
    },
    'pass',
  );

  return null;
}
