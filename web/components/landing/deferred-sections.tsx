'use client';

import dynamic from 'next/dynamic';
import { type ComponentType, Suspense, useEffect, useState } from 'react';

/**
 * Below-the-fold sections whose JavaScript (motion, the scroll scenes, the product UI they draw) stays out
 * of the landing's first load. The server still renders each one in full, with its CSS, so the HTML, SEO
 * and layout are unchanged (CLS 0). On the first page load React keeps that HTML dehydrated inside a
 * Suspense boundary and hydrates it when the section nears the screen or the browser first goes idle,
 * after the hero; the chunk itself is preloaded at low priority by next/dynamic, so hydration does not
 * wait on the network.
 * Rendered after a client-side navigation (no server HTML to keep), a section loads at once.
 */

interface Gate {
  wait: () => Promise<void>;
  open: () => void;
}

function gate(): Gate {
  let open = () => {};
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  // The server renders straight through; only the browser waits.
  return { wait: () => (typeof window === 'undefined' ? Promise.resolve() : opened), open };
}

function nearViewport<P extends object>(anchorId: string, Section: ComponentType<P>, door: Gate) {
  function Deferred(props: P) {
    // The section's root id is in the DOM only when this render hydrates the server HTML.
    const [fromServer] = useState(
      () => typeof document === 'undefined' || document.getElementById(anchorId) !== null,
    );

    useEffect(() => {
      const el = fromServer ? document.getElementById(anchorId) : null;
      if (!el) {
        door.open();
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          door.open();
        },
        { rootMargin: '150% 0px' },
      );
      observer.observe(el);
      // Or once the browser is idle after the first paint, whichever comes first: a section that settles
      // its layout on mount (media queries, measured stages) then does so off screen, so an anchor jump
      // or a fast scroll never lands on it mid-shift.
      // Safari has no requestIdleCallback.
      const ric = window.requestIdleCallback as Window['requestIdleCallback'] | undefined;
      const idle = ric ? ric(door.open, { timeout: 2500 }) : window.setTimeout(door.open, 1500);
      return () => {
        observer.disconnect();
        if (ric) window.cancelIdleCallback(idle);
        else window.clearTimeout(idle);
      };
    }, [fromServer]);

    if (!fromServer) door.open();
    // ponytail: no Suspense after a client navigation, so the transition waits for the chunk instead of
    // flashing an empty section.
    return fromServer ? (
      <Suspense fallback={null}>
        <Section {...props} />
      </Suspense>
    ) : (
      <Section {...props} />
    );
  }
  return Deferred;
}

const problem = gate();
const loop = gate();
const creators = gate();
const fans = gate();
const connect = gate();

// Each loader names its import inline so next/dynamic can render the section's CSS on the server.
export const ProblemSection = nearViewport(
  'problem',
  dynamic(() =>
    problem
      .wait()
      .then(() => import('./problem-section'))
      .then((m) => m.ProblemSection),
  ),
  problem,
);
export const LoopSection = nearViewport(
  'one-week',
  dynamic(() =>
    loop
      .wait()
      .then(() => import('./loop-section'))
      .then((m) => m.LoopSection),
  ),
  loop,
);
export const CreatorsSection = nearViewport(
  'creators',
  dynamic(() =>
    creators
      .wait()
      .then(() => import('./creators-section'))
      .then((m) => m.CreatorsSection),
  ),
  creators,
);
export const FansSection = nearViewport(
  'fans',
  dynamic(() =>
    fans
      .wait()
      .then(() => import('./fans-section'))
      .then((m) => m.FansSection),
  ),
  fans,
);
export const ConnectSection = nearViewport(
  'connect',
  dynamic(() =>
    connect
      .wait()
      .then(() => import('./connect-section'))
      .then((m) => m.ConnectSection),
  ),
  connect,
);
