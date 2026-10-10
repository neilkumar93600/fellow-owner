import Link from 'next/link';
import type * as React from 'react';
import { Logo } from '@/components/shared/logo';
import { cn } from '@/lib/utils';

/**
 * Two-column frame for auth and onboarding: a frosted form panel on the left and the art column on the
 * right, both floating on the page aurora (no frame, no grey shell). Below 1024px the art drops under
 * the form (or is hidden with `hideAsideOnMobile`). `aside` fills its column edge to edge, so a photo
 * can sit in it; give it its own glass chips for any text.
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
    <div className={cn('min-h-svh p-3 sm:p-4', className)}>
      <div className="grid min-h-[calc(100svh-1.5rem)] gap-3 sm:min-h-[calc(100svh-2rem)] sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
        <main
          id="main"
          className="glass-strong relative flex min-w-0 flex-col px-5 py-6 sm:px-10 sm:py-8 lg:px-14 xl:px-20"
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
            'relative isolate min-w-0 overflow-hidden rounded-panel border border-white/60 shadow-glass',
            hideAsideOnMobile && 'hidden lg:block',
          )}
        >
          {aside}
        </aside>
      </div>
    </div>
  );
}
