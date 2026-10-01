'use client';

import { ReactLenis, useLenis } from 'lenis/react';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { usePrefersReducedMotion } from '@/hooks/use-media-query';

function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|Chromium|Android/.test(ua);
}

/**
 * Lenis smooth scroll: Safari gets a higher lerp and no syncTouch; reduced motion gets native scroll.
 * The tree keeps one shape either way: Lenis is a childless sibling of the page (it sets up the root
 * instance that useLenis reads), so switching it off never unmounts and re-creates the page.
 */
function SmoothScroll() {
  const reduced = usePrefersReducedMotion();
  // Read once on the client; Lenis renders no DOM here, so this cannot cause a hydration mismatch.
  const [safari] = useState(isSafari);

  if (reduced) return null;
  return (
    <ReactLenis
      root
      options={{
        lerp: safari ? 0.1 : 0.085,
        smoothWheel: true,
        syncTouch: false,
        anchors: { offset: -16 },
      }}
    />
  );
}

/** px value of --nav-clear (globals.css): the band under the fixed navbar a focused control must clear. */
function navClear(): number {
  const value = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--nav-clear'),
  );
  return Number.isFinite(value) ? value : 96;
}

/** Sticky (pinned scene) or fixed layers do not move with the page, so scrolling cannot clear them. */
function inPinnedLayer(el: HTMLElement): boolean {
  for (
    let node: HTMLElement | null = el;
    node && node !== document.body;
    node = node.parentElement
  ) {
    const { position } = getComputedStyle(node);
    if (position === 'sticky' || position === 'fixed') return true;
  }
  return false;
}

/**
 * WCAG 2.4.11: keyboard focus must never land under the fixed navbar. One frame after focus moves (so the
 * browser's own scroll-into-view has run), a control that sits under the bar is brought just below it.
 */
function FocusClear() {
  const lenis = useLenis();
  useEffect(() => {
    let frame = 0;
    const onFocusIn = (event: FocusEvent) => {
      const el = event.target;
      if (!(el instanceof HTMLElement) || el === document.body) return;
      // Header controls and programmatic targets (section headings) are left alone.
      if (el.closest('header') || el.getAttribute('tabindex') === '-1') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (document.activeElement !== el || !el.matches(':focus-visible')) return;
        const clear = navClear();
        const rect = el.getBoundingClientRect();
        if (rect.height === 0 || rect.top >= clear || rect.bottom <= 0) return;
        if (inPinnedLayer(el)) return;
        const target = Math.max(0, window.scrollY + rect.top - clear);
        if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
        else window.scrollTo({ top: target, behavior: 'instant' });
      });
    };
    document.addEventListener('focusin', onFocusIn);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [lenis]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SmoothScroll />
      <FocusClear />
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'var(--card-strong)',
            color: 'var(--ink)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            fontFamily: 'var(--font-sans)',
          },
        }}
      />
    </ThemeProvider>
  );
}
