'use client';

import './globals.css';
import { useEffect } from 'react';
import { AuroraBackdrop } from '@/components/shared/aurora-backdrop';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { DISPLAY_H1 } from '@/lib/constants';
import { instrumentSerif, inter } from '@/lib/fonts';

/**
 * Replaces the root layout when it fails, so it brings its own document, the global styles, both fonts
 * and the aurora backdrop. Back home is a plain link on purpose: a full load rebuilds whatever broke.
 */
export default function GlobalError({
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
    <html lang="en" className={cn(inter.variable, instrumentSerif.variable, 'antialiased')}>
      <body className="bg-cream text-ink">
        <AuroraBackdrop />
        <title>Something went wrong · Fellow Owners</title>
        <main className="grid min-h-svh place-items-center p-4 sm:p-6">
          <div className="glass-strong flex w-full max-w-[560px] flex-col items-center px-6 py-12 text-center sm:px-12">
            <h1 className={DISPLAY_H1}>
              Something <em>went wrong</em>.
            </h1>
            <p className="mt-3 max-w-[44ch] text-body text-ink">
              Fellow Owners could not load. Try again in a moment.
            </p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <button type="button" onClick={() => retry()} className={buttonVariants()}>
                Try again
              </button>
              <a href="/" className={buttonVariants({ variant: 'secondary', surface: 'glass' })}>
                Back home
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
