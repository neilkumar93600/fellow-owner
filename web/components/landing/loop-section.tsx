'use client';

import { useEffect, useState } from 'react';
import { LoopScene } from './loop-scene';
import { LoopStatic } from './loop-static';

// Without JavaScript the pinned scene has nothing to scrub, so the static stack takes its place.
const NO_SCRIPT_CSS =
  '[data-loop-scene]{display:none!important}[data-loop-static]{display:block!important}';
const REDUCE = '(prefers-reduced-motion: reduce)';

/**
 * How it works (round 4 spec §3): Followers, Communities, Ideas, Crews, Featured, told over a scrubbed
 * recording of the product with the live product UI in front. Reduced motion and no-JS get the five
 * steps stacked instead, and the scene's display:none keeps its canvas from fetching frames.
 *
 * The server (and no-JS) render both copies and CSS shows one, so nothing shifts. Once mounted, the
 * media query is known and the hidden copy is dropped, leaving one heading and one set of steps.
 */
export function LoopSection() {
  const [reduce, setReduce] = useState<boolean | null>(null);

  useEffect(() => {
    const list = window.matchMedia(REDUCE);
    const update = () => setReduce(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, []);

  return (
    // Named by the rendered copy's heading (a hidden one still names it before mount and without JS).
    <section
      id="one-week"
      aria-labelledby={reduce ? 'loop-title-static' : 'loop-title'}
      className="relative"
    >
      {reduce !== true && (
        <div data-loop-scene className="motion-reduce:hidden">
          <LoopScene />
        </div>
      )}
      {reduce !== false && (
        <div data-loop-static className="hidden motion-reduce:block">
          <LoopStatic />
        </div>
      )}
      <noscript>
        <style>{NO_SCRIPT_CSS}</style>
      </noscript>
    </section>
  );
}
