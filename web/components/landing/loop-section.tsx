'use client';

import { useEffect, useState } from 'react';
import { LoopScene } from './loop-scene';
import { LoopStatic } from './loop-static';

/**
 * Without JavaScript the pinned scene has nothing to scrub, so it unpins and its five cards stack in flow
 * (rail hidden). The words stay in one copy in the server HTML: the scene's cards.
 */
const NO_SCRIPT_CSS = [
  '[data-loop-scene]{display:block!important}',
  '[data-loop-track]{height:auto!important}',
  '[data-loop-track]>div{position:relative!important;height:auto!important}',
  '[data-loop-rail]{display:none!important}',
  '[data-loop-cards]{display:flex!important;flex-direction:column;gap:16px}',
  '[data-loop-card]{position:relative!important;inset:auto!important;opacity:1!important;visibility:visible!important;transform:none!important}',
].join('');
const REDUCE = '(prefers-reduced-motion: reduce)';

/**
 * How it works (round 4 spec §3): Followers, Communities, Ideas, Crews, Featured, told over a scrubbed
 * recording of the product with the live product UI in front. Reduced motion gets the five steps stacked
 * instead (LoopStatic), and the scene's display:none keeps its canvas from fetching frames.
 *
 * The server renders the scene only, so the page carries one copy of the words. Under reduced motion the
 * scene is CSS-hidden until mount, then swapped for the static stack (below the fold, so nothing visible shifts).
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
    <section
      id="one-week"
      aria-labelledby={reduce ? 'loop-title-static' : 'loop-title'}
      className="relative"
    >
      {reduce ? (
        <LoopStatic />
      ) : (
        <div data-loop-scene className="motion-reduce:hidden">
          <LoopScene />
        </div>
      )}
      <noscript>
        <style>{NO_SCRIPT_CSS}</style>
      </noscript>
    </section>
  );
}
