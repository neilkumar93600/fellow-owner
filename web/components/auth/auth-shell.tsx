import Link from 'next/link';
import type * as React from 'react';
import { SkipLink } from '@/components/layout/app-shell';
import { Logo } from '@/components/shared/logo';
import { cx, FOCUS_RING } from './auth-classes';
import { AuthPanel } from './auth-panel';
import { AuthAltLink, AuthBackLink } from './auth-switch';
import { RouteFocus } from './route-focus';

/**
 * The split frame onboarding shares with auth: no frame of its own, the page aurora (app/layout.tsx)
 * shows through. `children` are the grid items: the form column (SPLIT_COLUMN) and the sticky aside
 * (SPLIT_ASIDE). A server component, so a client screen can fill both columns from one state.
 */
export function SplitFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh">
      <SkipLink />
      <div className="isolate flex min-h-svh flex-col">
        <div className="grid flex-1 gap-6 p-4 lg:grid-cols-2 lg:p-6">{children}</div>
      </div>
    </div>
  );
}

/**
 * Every auth screen: one frosted glass frame floats on the aurora, one viewport tall from 1024px. The
 * left half holds the logo, the form centred at a readable measure (400px, 448px for the tall
 * create-account form) and the switch link; the right half is Mira's photo, inset 8px with radius 24.
 * From 1024px only the form scrolls, under a fixed logo row, so the picture never moves. Phones get the
 * glass frame alone (no picture download) and scroll as a page.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="isolate flex min-h-svh flex-col p-3 sm:p-4 lg:h-svh lg:short:p-3">
      <SkipLink />
      <div className="glass-strong grid w-full flex-1 rounded-[1.75rem] p-2 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:grid-rows-1 lg:rounded-[2rem]">
        <div className="flex min-w-0 flex-col lg:min-h-0">
          <header className="box-content flex h-11 shrink-0 items-center justify-between gap-4 px-3 pt-1 sm:px-6 sm:pt-2 lg:px-8 xl:px-12">
            <Link
              href="/"
              aria-label="Fellow Owners home"
              className={cx(
                'inline-flex h-11 min-w-11 shrink-0 items-center rounded-full',
                FOCUS_RING,
              )}
            >
              <Logo />
            </Link>
            <AuthBackLink />
          </header>
          {/* The scroller spans the column, so its bar sits by the picture, not inside the padding.
              Relative, so sr-only live regions inside it scroll with it instead of stretching the page. */}
          <main
            id="main"
            tabIndex={-1}
            className="relative flex flex-1 flex-col overscroll-contain px-3 pb-3 outline-none [scrollbar-width:thin] sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:px-8 xl:px-12"
          >
            {/* my-auto, not justify-center: it centres the form yet falls back to the top when the
                column is shorter than the form, so nothing is ever cut off above. */}
            <div className="mx-auto my-auto w-full max-w-[25rem] py-4 has-[[data-size=tall]]:max-w-[28rem] lg:py-2">
              {children}
              <AuthAltLink className="mt-4 short:mt-3" />
            </div>
          </main>
          <RouteFocus />
        </div>
        <AuthPanel />
      </div>
    </div>
  );
}
