'use client';

import { useLenis } from 'lenis/react';
import { usePathname } from 'next/navigation';
import type * as React from 'react';
import { useCallback } from 'react';

/** Same offset as the Lenis `anchors` option in app/providers.tsx, so every anchor lands alike. */
const ANCHOR_OFFSET = -16;

/**
 * The marketing navbar's and footer's section links (creator pivot spec section 5). "How it works" is the
 * "One week with Mira" story.
 */
export const LANDING_LINKS = [
  { href: '/#one-week', label: 'How it works' },
  { href: '/#creators', label: 'For creators' },
  { href: '/#fans', label: 'For fans' },
  { href: '/#faq', label: 'FAQ' },
] as const;

/** '/#faq' -> 'faq' when the link points at a section of the landing page, otherwise null. */
export function sectionIdFrom(href: string): string | null {
  const hash = href.indexOf('#');
  if (hash === -1) return null;
  const path = href.slice(0, hash) || '/';
  return path === '/' ? href.slice(hash + 1) || null : null;
}

function isPlainClick(event: React.MouseEvent) {
  return !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0);
}

/** Moves keyboard focus to the section heading without scrolling, so Tab continues from there. */
function focusSection(target: HTMLElement) {
  const heading = target.matches('h1, h2, h3')
    ? target
    : target.querySelector<HTMLElement>('h2, h1, h3');
  const el = heading ?? target;
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

/**
 * Click handler for links to landing sections ('/#problem') and to the top of the page ('/').
 * On the landing page it scrolls with Lenis (or jumps natively when Lenis is off for reduced motion)
 * and moves focus to the section heading. On other pages the Link navigates to '/' as usual.
 */
export function useSectionLink(onNavigate?: () => void) {
  const lenis = useLenis();
  const pathname = usePathname();

  return useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      onNavigate?.();
      if (pathname !== '/' || !isPlainClick(event)) return;

      if (href === '/') {
        event.preventDefault();
        if (lenis) lenis.scrollTo(0);
        else window.scrollTo({ top: 0 });
        return;
      }

      const id = sectionIdFrom(href);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      event.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: ANCHOR_OFFSET });
      else target.scrollIntoView({ block: 'start' });
      focusSection(target);
    },
    [lenis, pathname, onNavigate],
  );
}
