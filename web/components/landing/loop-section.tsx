import { LoopScene } from './loop-scene';
import { LoopStatic } from './loop-static';

// Without JavaScript the pinned scene has nothing to scrub, so the static stack takes its place.
const NO_SCRIPT_CSS =
  '[data-loop-scene]{display:none!important}[data-loop-static]{display:block!important}';

/**
 * The loop (landing brief v2, part 4): Followers, Communities, Ideas, Collaboration, Action, told by a
 * 120-frame clip scrubbed on a pinned canvas. Reduced motion and no-JS get the five key frames stacked
 * with the same copy instead.
 */
export function LoopSection() {
  return (
    // Named by the scene's heading; it stays the name when the scene is hidden (reduced motion, no JS).
    <section id="loop" aria-labelledby="loop-title" className="relative">
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
