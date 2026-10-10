import { LoopScene } from './loop-scene';
import { LoopStatic } from './loop-static';

// Without JavaScript the pinned scene has nothing to scrub, so the static stack takes its place.
const NO_SCRIPT_CSS =
  '[data-loop-scene]{display:none!important}[data-loop-static]{display:block!important}';

/**
 * How it works (round 4 spec §3): Followers, Communities, Ideas, Crews, Featured, told over a scrubbed
 * recording of the product with the live product UI in front. Reduced motion and no-JS get the five
 * steps stacked instead, and the scene's display:none keeps its canvas from fetching frames.
 */
export function LoopSection() {
  return (
    // Named by the scene's heading; it stays the name when the scene is hidden (reduced motion, no JS).
    <section id="one-week" aria-labelledby="loop-title" className="relative">
      <div data-loop-scene className="motion-reduce:hidden">
        <LoopScene />
      </div>
      <div data-loop-static className="hidden motion-reduce:block">
        <LoopStatic />
      </div>
      <noscript>
        <style>{NO_SCRIPT_CSS}</style>
      </noscript>
    </section>
  );
}
