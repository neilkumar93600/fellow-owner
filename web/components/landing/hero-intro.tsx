'use client';

import { useEffect } from 'react';

/** Fired on window when html.intro-play is added; the hero canvas starts its gather from this moment. */
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
 * Runs during HTML parsing, before the hero paints: hides the hero (and the navbar, which keys off the same
 * classes) unless the visitor prefers reduced motion or arrived on an anchor. A 5s failsafe always reveals.
 */
const INTRO_SCRIPT = `(function(){try{var d=document.documentElement,w=window;if(location.hash||(w.matchMedia&&w.matchMedia("(prefers-reduced-motion: reduce)").matches))return;d.classList.add("intro");w.__foIntro=1;setTimeout(function(){d.classList.remove("intro","intro-play");w.__foIntro=0},5000)}catch(e){}})();`;

/**
 * Orbit-style entrance controller. Waits for fonts (700ms fallback), then two frames, then adds
 * html.intro-play; removes both classes on the last CTA's animationend (3s fallback) so nothing keeps
 * animating or holding will-change afterwards.
 */
export function HeroIntro() {
  useEffect(() => {
    const w = window as IntroWindow;
    const root = document.documentElement;
    if (w.__foIntro !== 1) return;
    // Dev Strict Mode can reset <html> attributes on its remount; put the class back (no-op in production).
    root.classList.add('intro');

    let cancelled = false;
    let frame = 0;
    let fallback = 0;
    let last: HTMLElement | null = null;

    const onEnd = (event: AnimationEvent) => {
      if (event.target === last) finish();
    };
    function finish() {
      root.classList.remove('intro', 'intro-play');
      w.__foIntro = 0;
      window.clearTimeout(fallback);
      last?.removeEventListener('animationend', onEnd);
    }
    const play = () => {
      if (cancelled) return;
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (cancelled || w.__foIntro !== 1) return;
          w.__foIntro = 2;
          w.__foIntroAt = performance.now();
          root.classList.add('intro-play');
          window.dispatchEvent(new Event(INTRO_PLAY_EVENT));
          last = document.querySelector<HTMLElement>('[data-hero-last]');
          last?.addEventListener('animationend', onEnd);
          fallback = window.setTimeout(finish, 3000);
        });
      });
    };

    const fonts = document.fonts?.ready ?? Promise.resolve();
    const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, 700));
    Promise.race([fonts, timeout]).then(play, play);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      // A real unmount (soft navigation away) must never leave the page hidden. Strict Mode's simulated
      // unmount keeps the hero in the DOM, so the check below lets it continue.
      window.setTimeout(() => {
        if (!document.querySelector('[data-hero-last]')) finish();
      }, 0);
      if (w.__foIntro === 2) finish();
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
