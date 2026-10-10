'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { DISPLAY_H1 } from '@/lib/constants';
import { routes } from '@/lib/routes';

/**
 * A calm, text-only error panel in the 404's frame: frosted glass on the page aurora. Try again calls
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
        <p className="mt-3 max-w-[44ch] text-body text-ink">
          This page did not load, and it was nothing you did. Try again, or head home and come back
          in a minute.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button onClick={() => retry()}>Try again</Button>
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
