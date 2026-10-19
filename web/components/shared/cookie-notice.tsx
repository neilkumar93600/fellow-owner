'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { chooseConsent, GA_ID, reopenConsent, useConsent } from '@/components/shared/analytics';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { isMarketingPath } from '@/lib/constants';
import { giveConsent, hasConsent } from '@/lib/local-state';

/*
 * The cookie bar. Without NEXT_PUBLIC_GA_ID the site sets essential cookies only, so it stays a notice
 * (ePrivacy needs no consent for those) with today's copy. With an id it becomes a consent banner: two
 * equal pills, "Essential only" and "Accept analytics" (same style, same size, neither preselected or
 * coloured), "Details" to the cookie policy, nothing loaded until a choice, and "Cookie settings" in the
 * footer opens it again. It never blocks the page.
 */

// Phones and small tablets: one full-width row on the bottom edge. From 768px: a compact glass toast,
// 360px wide, in a bottom corner, so it never sits over a heading or a CTA in the middle of the page.
const BAR =
  'pointer-events-none fixed inset-x-0 z-30 p-2 sm:p-4 md:inset-x-auto md:w-[22.5rem] md:p-0';
// Marketing pages: no bottom tab bar on phones, so the bar sits on the edge; the toast takes the left corner.
const BAR_ON_EDGE =
  'bottom-[env(safe-area-inset-bottom)] md:bottom-[calc(1rem+env(safe-area-inset-bottom))] md:left-4';
// App pages: the bar clears the phone tab bar; from 768px the left corner is the icon rail, so the right.
const BAR_CLEAR_TABS =
  'bottom-0 max-md:bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-4 md:right-4';
// One row, about 48px tall on phones: short text, a text link, the pill(s). Wraps into the toast from 768px.
const PANEL =
  'glass-strong pointer-events-auto mx-auto flex max-w-5xl items-center gap-2 rounded-full py-1 pr-1 pl-4 outline-none sm:gap-4 sm:pr-2 sm:pl-6 md:flex-wrap md:gap-x-3 md:gap-y-2 md:rounded-[1.25rem] md:p-3 md:pl-4';
const TEXT = 'min-w-0 flex-1 text-xs leading-tight text-ink-soft sm:text-small sm:leading-snug';
const PILL = cn(buttonVariants({ variant: 'secondary', size: 'md' }), 'max-sm:px-3 md:px-2.5');
const DETAILS =
  'rounded-full font-medium text-ink uppercase underline decoration-ink-soft underline-offset-4 transition-colors hover:decoration-ink focus-visible:decoration-ink';
const DETAILS_LINK = cn(DETAILS, 'inline-flex min-h-10 items-center px-1 text-xs sm:text-small');

/** The bar's corner: the marketing pages have no bottom tab bar to clear and no icon rail. */
function useBarClass() {
  return cn(BAR, isMarketingPath(usePathname()) ? BAR_ON_EDGE : BAR_CLEAR_TABS);
}

export function CookieNotice() {
  return GA_ID ? <ConsentBanner /> : <EssentialNotice />;
}

// Storage can be blocked: then the notice stays dismissed for the rest of this page session.
let dismissedThisSession = false;

// ponytail: one slim bar. Details is the /cookies page, which already lists every cookie and storage key.
function EssentialNotice() {
  const [open, setOpen] = useState(false);
  const bar = useBarClass();

  useEffect(() => {
    if (!dismissedThisSession && !hasConsent()) setOpen(true);
  }, []);

  if (!open) return null;

  function handleAccept() {
    dismissedThisSession = true;
    giveConsent();
    setOpen(false);
  }

  return (
    <aside aria-label="Cookie notice" className={bar}>
      <div className={PANEL}>
        <p className={cn(TEXT, 'md:basis-full')}>Essential cookies only. No ads, no trackers.</p>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3 md:ml-auto">
          <Link href="/cookies" className={DETAILS_LINK}>
            Details
          </Link>
          <button type="button" onClick={handleAccept} className={PILL}>
            Accept
          </button>
        </div>
      </div>
    </aside>
  );
}

function ConsentBanner() {
  const consent = useConsent();
  const panel = useRef<HTMLDivElement>(null);
  const bar = useBarClass();
  const asking = consent?.asking ?? false;

  // Reopened from "Cookie settings": move focus here so the choice is one Tab away.
  useEffect(() => {
    if (asking) panel.current?.focus();
  }, [asking]);

  if (!consent || (consent.choice && !consent.asking)) return null;

  return (
    <aside aria-label="Cookie consent" className={bar}>
      <div ref={panel} tabIndex={-1} className={PANEL}>
        <p className={TEXT}>
          <span className="sm:hidden">Analytics cookies?</span>
          <span className="max-sm:hidden">
            Essential cookies keep you signed in. With your OK, Google Analytics counts visits. No
            ad tracking.
          </span>{' '}
          {consent.choice ? (
            <span className="text-ink">
              Analytics is {consent.choice === 'analytics' ? 'on' : 'off'}.{' '}
            </span>
          ) : null}
        </p>
        <Link href="/cookies" className={cn(DETAILS_LINK, 'shrink-0')}>
          Details
        </Link>
        <div className="flex shrink-0 gap-1 sm:gap-2 md:basis-full">
          <button
            type="button"
            onClick={() => chooseConsent('essential')}
            className={cn(PILL, 'sm:w-40 md:w-auto md:flex-1')}
          >
            Essential<span className="sr-only sm:not-sr-only">&nbsp;only</span>
          </button>
          <button
            type="button"
            onClick={() => chooseConsent('analytics')}
            className={cn(PILL, 'sm:w-44 md:w-auto md:flex-1')}
          >
            Accept<span className="sr-only sm:not-sr-only">&nbsp;analytics</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

/**
 * "Cookie settings" for the footer's legal line: opens the consent banner again so a choice can be
 * changed or taken back. Nothing to set (so nothing rendered) without analytics.
 */
export function CookieSettingsButton({ className }: { className?: string }) {
  if (!GA_ID) return null;
  return (
    <button type="button" onClick={reopenConsent} className={cn('cursor-pointer', className)}>
      Cookie settings
    </button>
  );
}
