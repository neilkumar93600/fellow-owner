import type * as React from 'react';
import { cn } from '@/components/ui/cn';

/**
 * The frame for marketing and legal pages, under the landing navbar: one frosted panel floating on the page
 * aurora, so only the reading column sits on glass. It owns <main id="main">, where the navbar's skip link
 * lands. `wide` swaps the 720px reading column for a 1120px one that card grids need.
 */
export function PageFrame({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="px-3 pt-[calc(var(--nav-clear)+8px)] pb-12 outline-none sm:px-4 sm:pb-16 lg:px-6"
    >
      <div
        className={cn(
          'glass-strong mx-auto w-full px-5 py-8 sm:px-8 sm:py-12',
          wide ? 'max-w-[1168px]' : 'max-w-[768px]',
        )}
      >
        {children}
      </div>
    </main>
  );
}

/** "October 2, 2026" from "2026-10-02", the same on server and client. */
export function longDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

/** A Dove Grey date badge: "Last updated October 2, 2026", or a post's date. */
export function DateBadge({ iso, prefix }: { iso: string; prefix?: string }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full bg-table-head px-2.5 text-caption text-ink">
      {prefix ? `${prefix} ` : null}
      <time dateTime={iso}>{longDate(iso)}</time>
    </span>
  );
}
