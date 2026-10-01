'use client';

import { useLenis } from 'lenis/react';
import type * as React from 'react';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useScrollScene } from '@/hooks/use-scroll-scene';
import { formatNumber } from './creators-data';

/*
 * Motion islands for "For creators". The section and its three screens are server-rendered in their
 * finished, flat state; these components only enhance them:
 *  - CreatorsScene: picks the mode, lights the step whose screen is in front (DOM attributes, no React
 *    state per frame), runs the one-time reveals and, in pin mode, drives the deck.
 *  - CreatorsSlot: in flow mode, tilts its screen in 3D as it passes through the viewport.
 *  - CreatorsClicks: ticks the click count up once when it comes into view.
 *
 * Modes (data-mode on the scene root):
 *  - flow (server markup, no JS, reduced motion, phones and tablets, short windows): the screens follow
 *    each other down the page; from 1024px they pass beside the sticky story with a light 3D tilt.
 *  - pin (1024+ wide, 640+ tall, motion allowed): the whole grid pins for 200svh. The screens wait as a
 *    deck (the next ones peek out under the one in front) and swap in place on each step: the outgoing
 *    screen tips back and fades, the next one rises to the front. The swap is a CSS transition on
 *    transform and opacity; scroll only decides the step, so a screen is never left half-swapped.
 */

const TWO_COLUMN = '(min-width: 1024px)';
const PIN = '(min-width: 1024px) and (min-height: 640px)';
const REDUCE = '(prefers-reduced-motion: reduce)';

type Mode = 'flow' | 'pin';

/** Deck geometry (px, before the fit scale): how far each waiting screen peeks out, and its scale. */
const PEEK = [0, 16, 30];
const DEPTH_SCALE = [1, 0.94, 0.88];
/** Room kept under the deck, above the viewport bottom. */
const DECK_BOTTOM = 20;
/** Highest the deck may sit: just under the floating navbar (68px tall at its 12px offset). */
const DECK_TOP = 84;

interface SceneApi {
  mode: Mode;
  /**
   * Flow mode: slot `index` reports its distance from the viewport centre (0 centred, 1 off-screen) and
   * how far it has passed through the viewport (0..1), which fills its step's progress bar.
   */
  report: (index: number, distance: number, progress: number) => void;
}

const SceneContext = createContext<SceneApi | null>(null);

function setActiveStep(steps: HTMLElement[], active: number) {
  steps.forEach((step, index) => {
    const link = step.querySelector('a');
    if (index === active) {
      step.setAttribute('data-active', '');
      link?.setAttribute('aria-current', 'step');
    } else {
      step.removeAttribute('data-active');
      link?.removeAttribute('aria-current');
    }
  });
}

interface Deck {
  root: HTMLElement;
  deck: HTMLElement;
  top: HTMLElement | null;
  slots: HTMLElement[];
  layers: { el: HTMLElement; depth: number }[][];
  heights: number[];
  /** Step currently posed in front, or -1 before the first pose. */
  posed: number;
}

/** Writes each screen's resting pose for `active` in front; CSS transitions animate the change. */
function poseDeck(deck: Deck, active: number) {
  deck.posed = active;
  const front = deck.heights[active] ?? 0;
  deck.slots.forEach((slot, index) => {
    const rel = index - active;
    let transform: string;
    let opacity: number;
    if (rel < 0) {
      // Gone: tipped back, lifted and receding behind the screen that replaced it.
      transform = 'translate3d(0, -56px, -140px) rotateX(10deg)';
      opacity = 0;
    } else if (rel === 0) {
      transform = 'none';
      opacity = 1;
    } else {
      // Waiting: smaller and behind, its bottom edge peeking out under the screen in front.
      const scale = DEPTH_SCALE[rel] ?? DEPTH_SCALE[DEPTH_SCALE.length - 1]!;
      const peek = PEEK[rel] ?? PEEK[PEEK.length - 1]!;
      const y = front + peek - (deck.heights[index] ?? 0) * scale;
      transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(${scale})`;
      // Opaque, so the screens behind never show through; CSS tints it towards the field instead.
      opacity = 1;
    }
    slot.style.transform = transform;
    slot.style.opacity = String(opacity);
    slot.style.zIndex = String(rel < 0 ? 0 : 10 - rel);
    if (rel > 0) slot.setAttribute('data-waiting', String(Math.min(rel, 2)));
    else slot.removeAttribute('data-waiting');
  });
}

/** Measures the screens and places the deck: level with the top of the story, scaled to fit the height. */
function layoutDeck(deck: Deck) {
  deck.heights = deck.slots.map((slot) => slot.offsetHeight);
  const tallest = Math.max(0, ...deck.heights);
  if (tallest === 0) return;
  const vh = window.innerHeight;
  const aside = deck.top?.parentElement;
  const storyTop =
    deck.top && aside
      ? deck.top.getBoundingClientRect().top - aside.getBoundingClientRect().top
      : DECK_TOP;
  const peeks = PEEK[PEEK.length - 1]!;
  // The deck lays out at least 600px wide (creators.module.css); scale it back into its column too.
  const column = deck.deck.parentElement?.clientWidth ?? deck.deck.offsetWidth;
  const fit = Math.min(
    1,
    column / Math.max(1, deck.deck.offsetWidth),
    (vh - DECK_TOP - DECK_BOTTOM - peeks) / tallest,
  );
  const top = Math.max(DECK_TOP, Math.min(storyTop, vh - DECK_BOTTOM - peeks - tallest * fit));
  deck.deck.style.transform = `translate3d(0, ${top.toFixed(1)}px, 0) scale(${fit.toFixed(4)})`;
  if (deck.posed >= 0) poseDeck(deck, deck.posed);
}

function clearDeck(deck: Deck) {
  deck.deck.style.transform = '';
  for (const slot of deck.slots) {
    slot.style.transform = '';
    slot.style.opacity = '';
    slot.style.zIndex = '';
    slot.removeAttribute('data-waiting');
  }
  for (const layers of deck.layers) for (const layer of layers) layer.el.style.transform = '';
  deck.posed = -1;
}

export function CreatorsScene({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('flow');
  const modeRef = useRef<Mode>('flow');
  modeRef.current = mode;
  const deckRef = useRef<Deck | null>(null);
  const store = useRef({
    distances: [] as number[],
    active: -1,
    steps: [] as HTMLElement[],
    fills: [] as (HTMLElement | null)[],
    fillValues: [] as number[],
  });
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  const api = useMemo<SceneApi>(
    () => ({
      mode,
      report(index, distance, progress) {
        const state = store.current;
        state.distances[index] = distance;
        const fill = state.fills[index];
        if (fill) fill.style.transform = `scaleX(${progress.toFixed(3)})`;
        let best = -1;
        let bestDistance = Number.POSITIVE_INFINITY;
        state.distances.forEach((value, i) => {
          if (value < bestDistance) {
            bestDistance = value;
            best = i;
          }
        });
        if (best === -1 || best === state.active) return;
        state.active = best;
        setActiveStep(state.steps, best);
      },
    }),
    [mode],
  );

  /* Mode: pin on roomy screens with motion allowed. */
  useEffect(() => {
    const pin = window.matchMedia(PIN);
    const reduce = window.matchMedia(REDUCE);
    const update = () => setMode(pin.matches && !reduce.matches ? 'pin' : 'flow');
    update();
    pin.addEventListener('change', update);
    reduce.addEventListener('change', update);
    return () => {
      pin.removeEventListener('change', update);
      reduce.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const state = store.current;
    state.steps = Array.from(root.querySelectorAll<HTMLElement>('[data-creators-step]'));
    state.fills = state.steps.map((step) => step.querySelector<HTMLElement>('[data-step-fill]'));
    setActiveStep(state.steps, Math.max(0, state.active));
    root.setAttribute('data-scene', 'ready');

    // One-time reveals (fade and rise 16px). Only content still below the fold is hidden first, so
    // nothing visible ever blinks, and without JavaScript everything simply stays shown. Beside the
    // sticky story (1024+) the screens are never hidden: the tilt or the deck owns their opacity.
    if (window.matchMedia(REDUCE).matches) return;
    const twoColumn = window.matchMedia(TWO_COLUMN).matches;
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-creators-reveal]')).filter(
      (el) => !(twoColumn && el.dataset.creatorsReveal === 'mobile'),
    );
    const pending = targets.filter((el) => el.getBoundingClientRect().top > window.innerHeight);
    if (pending.length === 0) return;
    for (const el of pending) el.setAttribute('data-reveal', 'pending');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-reveal', 'shown');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    for (const el of pending) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* Pin mode: collect the deck, keep it measured, and route the step links to their moment in the scene. */
  useEffect(() => {
    const root = rootRef.current;
    if (mode !== 'pin' || !root) return;
    const deckEl = root.querySelector<HTMLElement>('[data-creators-deck]');
    if (!deckEl) return;
    const slots = Array.from(deckEl.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement,
    );
    const deck: Deck = {
      root,
      deck: deckEl,
      top: root.querySelector<HTMLElement>('[data-creators-top]'),
      slots,
      layers: slots.map((slot) =>
        Array.from(slot.querySelectorAll<HTMLElement>('[data-depth]')).map((el) => ({
          el,
          depth: Number(el.dataset.depth) || 0,
        })),
      ),
      heights: [],
      posed: -1,
    };
    deckRef.current = deck;
    const state = store.current;
    state.fillValues = [];

    const measure = () => layoutDeck(deck);
    measure();
    poseDeck(deck, Math.max(0, state.active));
    const observer = new ResizeObserver(measure);
    observer.observe(deckEl);
    if (deck.top) observer.observe(deck.top);
    window.addEventListener('resize', measure, { passive: true });

    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('[data-creators-step] a');
      if (!link || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const index = state.steps.findIndex((step) => step.contains(link));
      if (index < 0) return;
      // Lenis handles in-page anchors itself (on the document); in pin mode the slots are stacked
      // in one sticky frame, so the step's moment in the scene is the target, not the slot.
      event.preventDefault();
      event.stopPropagation();
      const distance = root.offsetHeight - window.innerHeight;
      const top = root.getBoundingClientRect().top + window.scrollY;
      const target = top + distance * ((index + 0.12) / Math.max(1, slots.length));
      if (lenisRef.current) lenisRef.current.scrollTo(target, { duration: 1.1 });
      else window.scrollTo({ top: target, behavior: 'smooth' });
    };
    root.addEventListener('click', onClick);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      root.removeEventListener('click', onClick);
      clearDeck(deck);
      deckRef.current = null;
      state.fillValues = [];
    };
  }, [mode]);

  /* Pin mode, per frame: the step in front, its progress bar, and the parallax inside it. */
  useScrollScene(
    rootRef,
    ({ progress }) => {
      const deck = deckRef.current;
      if (modeRef.current !== 'pin' || !deck) return;
      const state = store.current;
      const count = deck.slots.length;
      const scaled = progress * count;
      const active = Math.min(count - 1, Math.floor(scaled));
      // The last step fills to exactly 1 as the pin releases.
      const local = Math.min(1, scaled - active);

      if (active !== state.active) {
        state.active = active;
        setActiveStep(state.steps, active);
      }
      if (active !== deck.posed) poseDeck(deck, active);

      state.fills.forEach((fill, index) => {
        const value = index < active ? 1 : index > active ? 0 : Math.round(local * 1000) / 1000;
        if (!fill || state.fillValues[index] === value) return;
        state.fillValues[index] = value;
        fill.style.transform = `scaleX(${value})`;
      });

      // Layered parallax on the screen in front: chips and cards drift 4 to 10px against it.
      const d = 1 - 2 * local;
      for (const layer of deck.layers[active] ?? []) {
        layer.el.style.transform = `translate3d(0, ${(d * layer.depth).toFixed(2)}px, 0)`;
      }
    },
    'pin',
  );

  return (
    <SceneContext.Provider value={api}>
      <div ref={rootRef} className={className} data-mode={mode}>
        {children}
      </div>
    </SceneContext.Provider>
  );
}

/* ---------- 3D pass-through for one screen ---------- */

interface Pose {
  rx: number;
  ry: number;
  z: number;
  opacity: number;
}

/** Below the centre: leaning back and receded. Above it: tipping away as it leaves. */
const ENTER: Pose = { rx: 12, ry: -8, z: -80, opacity: 0.6 };
const LEAVE: Pose = { rx: -9, ry: 5, z: -70, opacity: 0.6 };
/** Flat and sharp while the screen's centre is within this share of the pass around the viewport centre. */
const PLATEAU = 0.2;
/** Fully posed from here out to the edges. */
const EDGE = 0.86;

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

export function CreatorsSlot({
  index,
  id,
  className,
  tiltClassName,
  children,
}: {
  index: number;
  id: string;
  className?: string;
  tiltClassName?: string;
  children: React.ReactNode;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const scene = useContext(SceneContext);
  const pinned = scene?.mode === 'pin';
  const live = useRef({
    tilt: false,
    flat: true,
    layers: [] as { el: HTMLElement; depth: number }[],
  });

  useEffect(() => {
    const tiltEl = tiltRef.current;
    if (!tiltEl) return;
    const state = live.current;
    state.layers = Array.from(tiltEl.querySelectorAll<HTMLElement>('[data-depth]')).map((el) => ({
      el,
      depth: Number(el.dataset.depth) || 0,
    }));

    const wide = window.matchMedia(TWO_COLUMN);
    const reduce = window.matchMedia(REDUCE);
    const sync = () => {
      // The deck owns the screens in pin mode; the tilt runs only in flow mode beside the story.
      state.tilt = !pinned && wide.matches && !reduce.matches;
      if (state.tilt) return;
      // Phones, tablets, reduced motion and the pinned deck: flat screens, no tilt parallax here.
      state.flat = true;
      tiltEl.style.transform = '';
      tiltEl.style.opacity = '';
      if (!pinned) for (const layer of state.layers) layer.el.style.transform = '';
    };
    sync();
    wide.addEventListener('change', sync);
    reduce.addEventListener('change', sync);
    return () => {
      wide.removeEventListener('change', sync);
      reduce.removeEventListener('change', sync);
    };
  }, [pinned]);

  useScrollScene(
    slotRef,
    ({ progress }) => {
      if (scene?.mode === 'pin') return;
      // d: 1 entering at the bottom, 0 centred, -1 leaving at the top.
      const d = 1 - 2 * progress;
      const distance = Math.abs(d);
      scene?.report(index, distance, progress);

      const state = live.current;
      const el = tiltRef.current;
      if (!state.tilt || !el) return;

      if (distance <= PLATEAU) {
        if (!state.flat) {
          // Exactly flat at rest, so the text rasterises crisply.
          el.style.transform = 'none';
          el.style.opacity = '1';
          state.flat = true;
        }
      } else {
        const t = smoothstep(Math.min(1, (distance - PLATEAU) / (EDGE - PLATEAU)));
        const pose = d > 0 ? ENTER : LEAVE;
        el.style.transform = `translate3d(0, 0, ${(pose.z * t).toFixed(1)}px) rotateX(${(pose.rx * t).toFixed(2)}deg) rotateY(${(pose.ry * t).toFixed(2)}deg)`;
        el.style.opacity = (1 - (1 - pose.opacity) * t).toFixed(3);
        state.flat = false;
      }

      // Layered parallax: chips and cards drift 4 to 10px against the screen.
      for (const layer of state.layers) {
        layer.el.style.transform = `translate3d(0, ${(d * layer.depth).toFixed(2)}px, 0)`;
      }
    },
    'pass',
  );

  return (
    <div ref={slotRef} id={id} className={className} data-creators-reveal="mobile">
      <div ref={tiltRef} className={tiltClassName}>
        {children}
      </div>
    </div>
  );
}

/* ---------- Click counter ---------- */

export function CreatorsClicks({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia(REDUCE).matches) return;
    const rect = el.getBoundingClientRect();
    // Already on screen at load: keep the final number rather than rewind it in view.
    if (rect.top < window.innerHeight && rect.bottom > 0) return;

    const start = Math.round(value * 0.82);
    el.textContent = formatNumber(start);
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const began = performance.now();
        const duration = 1400;
        const tick = (now: number) => {
          const t = Math.min(1, (now - began) / duration);
          const eased = 1 - (1 - t) ** 4;
          el.textContent = formatNumber(Math.round(start + (value - start) * eased));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.5, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <>
      <span ref={ref} className={className} aria-hidden="true">
        {formatNumber(value)}
      </span>
      <span className="sr-only">{formatNumber(value)}</span>
    </>
  );
}
