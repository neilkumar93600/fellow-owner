'use client';

import type * as React from 'react';
import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { useScrollScene } from '@/hooks/use-scroll-scene';
import { formatNumber } from './creators-data';

/*
 * Motion islands for "For creators". The section and its three screens are server-rendered in their
 * finished, flat state; these components only enhance them:
 *  - CreatorsScene: lights the step whose screen is closest to the viewport centre (DOM attributes, no
 *    React state), and runs the one-time reveals.
 *  - CreatorsSlot: tilts its screen in 3D as it passes through the viewport (desktop, motion allowed).
 *  - CreatorsClicks: ticks the click count up once when it comes into view.
 */

const DESKTOP = '(min-width: 1024px)';
const REDUCE = '(prefers-reduced-motion: reduce)';

interface SceneApi {
  /** Distance of slot `index` from the viewport centre: 0 centred, 1 off-screen. */
  report: (index: number, distance: number) => void;
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

export function CreatorsScene({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const store = useRef({ distances: [] as number[], active: -1, steps: [] as HTMLElement[] });

  const api = useMemo<SceneApi>(
    () => ({
      report(index, distance) {
        const state = store.current;
        state.distances[index] = distance;
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
    [],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const state = store.current;
    state.steps = Array.from(root.querySelectorAll<HTMLElement>('[data-creators-step]'));
    setActiveStep(state.steps, Math.max(0, state.active));
    root.setAttribute('data-scene', 'ready');

    // One-time reveals (fade and rise 16px). Only content still below the fold is hidden first, so
    // nothing visible ever blinks, and without JavaScript everything simply stays shown.
    if (window.matchMedia(REDUCE).matches) return;
    const desktop = window.matchMedia(DESKTOP).matches;
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-creators-reveal]')).filter(
      (el) => !(desktop && el.dataset.creatorsReveal === 'mobile'),
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

  return (
    <SceneContext.Provider value={api}>
      <div ref={rootRef} className={className}>
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

    const wide = window.matchMedia(DESKTOP);
    const reduce = window.matchMedia(REDUCE);
    const sync = () => {
      state.tilt = wide.matches && !reduce.matches;
      if (state.tilt) return;
      // Phones, tablets and reduced motion: flat screens, no parallax.
      state.flat = true;
      tiltEl.style.transform = '';
      tiltEl.style.opacity = '';
      for (const layer of state.layers) layer.el.style.transform = '';
    };
    sync();
    wide.addEventListener('change', sync);
    reduce.addEventListener('change', sync);
    return () => {
      wide.removeEventListener('change', sync);
      reduce.removeEventListener('change', sync);
    };
  }, []);

  useScrollScene(
    slotRef,
    ({ progress }) => {
      // d: 1 entering at the bottom, 0 centred, -1 leaving at the top.
      const d = 1 - 2 * progress;
      const distance = Math.abs(d);
      scene?.report(index, distance);

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
      { threshold: 1, rootMargin: '0px 0px -18% 0px' },
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
