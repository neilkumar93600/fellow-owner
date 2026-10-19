'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { DISPLAY_H1 } from '@/lib/constants';
import { routes } from '@/lib/routes';

/**
 * A calm, text-only error panel in the 404's frame: frosted glass on the parchment washes. Try again calls
 * `retry`, which re-fetches and re-renders the segment (Next 16 recommends it over `reset`, which only
 * clears the error state).
 */
export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="main"
      tabIndex={-1}
      className="grid min-h-svh place-items-center p-4 outline-none sm:p-6"
    >
      <div className="glass-strong flex w-full max-w-[560px] flex-col items-center px-6 py-12 text-center sm:px-12 sm:py-16">
        <h1 className={DISPLAY_H1}>
          Something <em>went wrong</em>.
        </h1>
        <p className="mt-3 max-w-[44ch] text-small text-ink-soft">
          This page did not load, and it was nothing you did. Try again, or head home and come back
          in a minute.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          {/* The root boundary loads on every route, so Try again is a plain button in Button's
              primary pill classes rather than the Base UI Button. */}
          <button type="button" onClick={() => retry()} className={cn(buttonVariants())}>
            Try again
          </button>
          <Link
            href={routes.home()}
            className={buttonVariants({ variant: 'secondary', surface: 'glass' })}
          >
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
