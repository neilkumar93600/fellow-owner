'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { chooseConsent, GA_ID, reopenConsent, useConsent } from '@/components/shared/analytics';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { giveConsent, hasConsent } from '@/lib/local-state';

/*
 * The cookie bar. Without NEXT_PUBLIC_GA_ID the site sets essential cookies only, so it stays a notice
 * (ePrivacy needs no consent for those) with today's copy. With an id it becomes a consent banner: two
 * equal pills, "Essential only" and "Accept analytics" (same style, same size, neither preselected or
 * coloured), "Details" to the cookie policy, nothing loaded until a choice, and "Cookie settings" in the
 * footer opens it again. It never blocks the page.
 */

const BAR =
  'pointer-events-none fixed inset-x-0 bottom-0 z-30 p-3 max-md:bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:p-4';
const PANEL = 'glass-strong pointer-events-auto mx-auto flex max-w-4xl rounded-3xl outline-none';
const TEXT = 'min-w-0 flex-1 text-xs leading-snug text-ink-soft sm:text-small';
const PILL = cn(buttonVariants({ variant: 'secondary', size: 'md' }), 'max-sm:h-11 max-sm:px-3');
const DETAILS =
  'rounded-full font-medium text-ink uppercase underline decoration-ink-soft underline-offset-4 transition-colors hover:decoration-ink';

export function CookieNotice() {
  return GA_ID ? <ConsentBanner /> : <EssentialNotice />;
}

// Storage can be blocked: then the notice stays dismissed for the rest of this page session.
let dismissedThisSession = false;

// ponytail: one slim bar. Details is the /cookies page, which already lists every cookie and storage key.
function EssentialNotice() {
  const [open, setOpen] = useState(false);

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
    <aside aria-label="Cookie notice" className={BAR}>
      <div className={cn(PANEL, 'items-center gap-3 px-4 py-2 sm:gap-4 sm:px-5')}>
        <p className={TEXT}>Essential cookies only. No ads, no trackers.</p>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/cookies"
            className={cn(
              DETAILS,
              'inline-flex min-h-11 items-center px-1 text-xs sm:min-h-10 sm:text-small',
            )}
          >
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
  const asking = consent?.asking ?? false;

  // Reopened from "Cookie settings": move focus here so the choice is one Tab away.
  useEffect(() => {
    if (asking) panel.current?.focus();
  }, [asking]);

  if (!consent || (consent.choice && !consent.asking)) return null;

  return (
    <aside aria-label="Cookie consent" className={BAR}>
      <div
        ref={panel}
        tabIndex={-1}
        className={cn(
          PANEL,
          'flex-col items-stretch gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5',
        )}
      >
        <p className={TEXT}>
          Essential cookies keep you signed in. With your OK, Google Analytics also counts visits so
          we can see which pages help. No ad tracking.{' '}
          {consent.choice ? (
            <span className="text-ink">
              Analytics is {consent.choice === 'analytics' ? 'on' : 'off'} now.{' '}
            </span>
          ) : null}
          <Link href="/cookies" className={DETAILS}>
            Details
          </Link>
        </p>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => chooseConsent('essential')}
            className={cn(PILL, 'sm:w-44')}
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => chooseConsent('analytics')}
            className={cn(PILL, 'sm:w-44')}
          >
            Accept analytics
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
