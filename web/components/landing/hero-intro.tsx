'use client';

import { useEffect } from 'react';

/** Fired on window when <html data-intro="play"> is set; the hero chips time their spring from this moment. */
export const INTRO_PLAY_EVENT = 'fo:intro-play';

/** 1 = waiting for fonts, 2 = playing, 0 or undefined = no entrance (reduced motion, soft nav, failsafe, done). */
type IntroWindow = Window & { __foIntro?: number; __foIntroAt?: number };

export type IntroState =
  | { phase: 'pending' }
  | { phase: 'playing'; at: number }
  | { phase: 'none' };

export function getIntroState(): IntroState {
  const w = window as IntroWindow;
  if (w.__foIntro === 1) return { phase: 'pending' };
  if (w.__foIntro === 2) return { phase: 'playing', at: w.__foIntroAt ?? performance.now() };
  return { phase: 'none' };
}

/**
 * Runs during HTML parsing, before the hero paints, and owns the whole entrance so it never waits for
 * React to hydrate (the sub-line is the LCP element):
 * - sets <html data-intro> (the hero and the navbar hide their parts) unless the visitor prefers reduced
 *   motion or arrived on an anchor;
 * - once fonts are ready (700ms at most), waits two frames, then sets data-intro="play", stamps
 *   __foIntroAt and fires INTRO_PLAY_EVENT;
 * - removes the attribute 2.4s into the play (the timeline is about 1.5s), or after 5s if play never began.
 * A data attribute, not a class: Lenis and next-themes rewrite the class list on <html>.
 */
const INTRO_SCRIPT = `(function(){try{var d=document.documentElement,w=window,A="data-intro";if(location.hash||(w.matchMedia&&w.matchMedia("(prefers-reduced-motion: reduce)").matches))return;d.setAttribute(A,"");w.__foIntro=1;var go=0;function end(){if(w.__foIntro){d.removeAttribute(A);w.__foIntro=0}}function play(){if(go||w.__foIntro!==1)return;go=1;requestAnimationFrame(function(){requestAnimationFrame(function(){if(w.__foIntro!==1)return;w.__foIntro=2;w.__foIntroAt=performance.now();d.setAttribute(A,"play");w.dispatchEvent(new Event("${INTRO_PLAY_EVENT}"));setTimeout(end,2400)})})}var f=document.fonts;if(f&&f.ready)f.ready.then(play,play);setTimeout(play,700);setTimeout(function(){if(w.__foIntro===1)end()},5000)}catch(e){}})();`;

/**
 * Client side of the entrance: ends it early on the portrait frame's animationend ([data-hero-last]) so
 * nothing keeps holding will-change, and never leaves the page hidden after a soft navigation away.
 */
export function HeroIntro() {
  useEffect(() => {
    const w = window as IntroWindow;
    const root = document.documentElement;
    if (!w.__foIntro) return;

    let last: HTMLElement | null = null;
    function finish() {
      if (!w.__foIntro) return;
      root.removeAttribute('data-intro');
      w.__foIntro = 0;
    }
    const onEnd = (event: AnimationEvent) => {
      if (event.target === last) finish();
    };
    const arm = () => {
      last = document.querySelector<HTMLElement>('[data-hero-last]');
      last?.addEventListener('animationend', onEnd);
    };
    if (w.__foIntro === 2) arm();
    else window.addEventListener(INTRO_PLAY_EVENT, arm, { once: true });

    return () => {
      window.removeEventListener(INTRO_PLAY_EVENT, arm);
      last?.removeEventListener('animationend', onEnd);
      // A real unmount (soft navigation away) must never leave the page hidden. Strict Mode's simulated
      // unmount keeps the hero in the DOM, so the check below lets the entrance continue.
      window.setTimeout(() => {
        if (!document.querySelector('[data-hero-last]')) finish();
      }, 0);
    };
  }, []);

  return (
    <script
      // Executable on the server render only; on the client it stays inert text (Next "preventing flash" guide).
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      // biome-ignore lint/security/noDangerouslySetInnerHtml: static first-paint script with no user input
      dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }}
    />
  );
}
