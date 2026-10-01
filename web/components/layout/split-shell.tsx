import type * as React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/shared/logo';
import { cn } from '@/lib/utils';

/**
 * Two-column frame for auth and onboarding (confirmed brief): the form column on white on the left,
 * and a panel on the right in the reference grey shell with the blue/teal/sand radial blur.
 * Below 1024px the panel drops under the form (or is hidden with `hideAsideOnMobile`).
 */
export function SplitShell({
  children,
  aside,
  footer,
  hideAsideOnMobile = false,
  className,
}: {
  children: React.ReactNode;
  aside: React.ReactNode;
  footer?: React.ReactNode;
  hideAsideOnMobile?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('min-h-svh bg-page p-2 sm:p-3', className)}>
      <div className="grid min-h-[calc(100svh-1rem)] gap-2 sm:min-h-[calc(100svh-1.5rem)] sm:gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
        <main
          id="main"
          className="relative flex min-w-0 flex-col rounded-[32px] bg-card-strong px-5 py-6 sm:px-10 sm:py-8 lg:rounded-shell lg:px-14 xl:px-20"
        >
          <header className="flex items-center justify-between gap-4">
            <Link href="/" aria-label="Fellow Owners home" className="rounded-full">
              <Logo />
            </Link>
          </header>
          <div className="flex flex-1 flex-col justify-center py-10">{children}</div>
          {footer ? <footer className="text-small text-ink-soft">{footer}</footer> : null}
        </main>
        <aside
          className={cn(
            'relative isolate min-w-0 overflow-hidden rounded-[32px] bg-shell lg:rounded-shell',
            hideAsideOnMobile && 'hidden lg:block',
          )}
        >
          <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-28 -z-10 size-[28rem] rounded-full bg-blur-1 opacity-40 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute right-40 -bottom-40 -z-10 size-[26rem] rounded-full bg-blur-2 opacity-40 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -right-10 bottom-40 -z-10 size-[20rem] rounded-full bg-blur-3 opacity-35 blur-3xl" />
          {aside}
        </aside>
      </div>
    </div>
  );
}
