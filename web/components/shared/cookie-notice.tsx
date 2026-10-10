'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { giveConsent, hasConsent } from '@/lib/local-state';

// Storage can be blocked: then the notice stays dismissed for the rest of this page session.
let dismissedThisSession = false;

// ponytail: one slim bar. Details is the /cookies page, which already lists every cookie and storage key.
export function CookieNotice() {
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
    <aside
      aria-label="Cookie notice"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 p-3 max-md:bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:p-4"
    >
      <div className="glass-strong pointer-events-auto mx-auto flex max-w-4xl items-center gap-3 rounded-2xl px-4 py-2 sm:gap-4 sm:px-5">
        <p className="min-w-0 flex-1 text-xs leading-snug text-ink-soft sm:text-small">
          Essential cookies only. No ads, no trackers.
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/cookies"
            className="inline-flex min-h-11 items-center rounded-full px-1 text-xs font-medium text-ink underline decoration-ink-soft underline-offset-4 transition-colors hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:min-h-10 sm:text-small"
          >
            Details
          </Link>
          <button
            type="button"
            onClick={handleAccept}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:min-h-10 sm:text-small"
          >
            Accept
          </button>
        </div>
      </div>
    </aside>
  );
}
