import Link from 'next/link';
import type * as React from 'react';
import { Logo } from '@/components/shared/logo';
import { routes } from '@/lib/routes';
import { SkipLink } from './app-shell';

const FOOTER_LINK =
  'press inline-flex h-11 items-center rounded-full px-3 text-small text-ink hover:bg-white/60';

/**
 * DESIGN.md Fan pages: one centred column, 840px at most, floating straight on the aurora (the root
 * layout paints it). No frame: on phones the column is the page with a 16px gutter, and every panel is its
 * own frosted glass. Document scroll. `topbar` goes above <main>; the slim footer (logo home, Privacy,
 * Terms; 44px targets) closes the column, and its words are ink because they sit on the bare backdrop.
 */
export function FanShell({
  topbar,
  children,
}: {
  topbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh">
      <SkipLink />
      <div className="mx-auto flex min-h-svh w-full max-w-[840px] flex-col px-4 py-4 sm:px-6 sm:py-6">
        {topbar}
        <main id="main" tabIndex={-1} className="@container flex-1 outline-none">
          {children}
        </main>
        <footer className="-mx-3 mt-12 flex items-center justify-between gap-4">
          <Link href={routes.home()} aria-label="Fellow Owners home" className={FOOTER_LINK}>
            <Logo />
          </Link>
          <nav aria-label="Legal">
            <ul className="flex items-center">
              <li>
                <Link href={routes.legal.privacyPolicy()} className={FOOTER_LINK}>
                  Privacy
                </Link>
              </li>
              <li>
                <Link href={routes.legal.terms()} className={FOOTER_LINK}>
                  Terms
                </Link>
              </li>
            </ul>
          </nav>
        </footer>
      </div>
    </div>
  );
}
