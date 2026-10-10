'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactLenis, useLenis } from 'lenis/react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { CookieNotice } from '@/components/shared/cookie-notice';
import { useMediaQuery, usePrefersReducedMotion } from '@/hooks/use-media-query';
import { isMarketingPath } from '@/lib/constants';
import { getQueryClient } from '@/lib/query-client';

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

/**
 * Phones carry a 64px floating bottom nav 12px above the safe area; toasts sit 12px above it. sonner
 * reads `mobileOffset` up to 600px and `offset` beyond, so both clear it below 768px.
 */
const NAV_CLEARANCE = { bottom: 'calc(88px + env(safe-area-inset-bottom))' };

const TOAST_ICONS = {
  success: <CircleCheck aria-hidden className="size-5" strokeWidth={1.5} />,
  error: <CircleAlert aria-hidden className="size-5 text-danger" strokeWidth={1.5} />,
  close: <X aria-hidden className="size-5" strokeWidth={1.5} />,
};

/**
 * DESIGN.md Toast: Pure White, radius 16, 1px line border, flat (no shadow), Body ink. Unstyled sonner,
 * so these classes are the whole look. sonner's own `outline: none` on a toast is unlayered CSS, hence
 * the important focus ring. Retry and the close ghost get a 44px hit area for fan pages.
 */
const TOAST_CLASSES = {
  toast:
    'flex w-(--width) items-center gap-3 rounded-lg border border-line bg-card-strong px-4 py-3 font-sans text-body text-ink focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-purple! [&[data-expanded=false][data-front=false]>*]:opacity-0',
  icon: 'flex size-5 shrink-0 items-center justify-center',
  content: 'flex min-w-0 flex-1 flex-col gap-0.5',
  description: 'text-small text-ink-muted',
  actionButton:
    'relative h-9 shrink-0 rounded-full border border-line bg-card-strong px-4 font-medium text-body text-ink transition-[background-color,transform] duration-150 ease-out-quart before:absolute before:-inset-1 hover:bg-page active:scale-[0.98]',
  closeButton:
    'relative order-last grid size-8 shrink-0 place-items-center rounded-full text-ink transition-[background-color,transform] duration-150 ease-out-quart before:absolute before:-inset-1.5 hover:bg-page active:scale-[0.98]',
};

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  // Smooth scroll and the navbar focus guard belong to the marketing chrome; the dashboard and fan
  // pages scroll natively (the creator shell scrolls inside its own container).
  const marketing = isMarketingPath(usePathname());
  const wide = useMediaQuery('(min-width: 768px)');

  return (
    <QueryClientProvider client={queryClient}>
      {marketing ? <SmoothScroll /> : null}
      {marketing ? <FocusClear /> : null}
      {children}
      <CookieNotice />
      <Toaster
        position={wide ? 'bottom-right' : 'bottom-center'}
        offset={wide ? undefined : NAV_CLEARANCE}
        mobileOffset={NAV_CLEARANCE}
        duration={6000}
        gap={12}
        containerAriaLabel="Notifications"
        icons={TOAST_ICONS}
        toastOptions={{
          unstyled: true,
          closeButtonAriaLabel: 'Dismiss',
          classNames: TOAST_CLASSES,
        }}
      />
    </QueryClientProvider>
  );
}
