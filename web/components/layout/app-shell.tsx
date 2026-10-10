'use client';

import type { StudioSpace } from '@fellow-owners/shared';
import * as React from 'react';
import { useSweep } from '@/hooks/queries/use-overview';
import { useStudioSpace } from '@/hooks/use-space';
import { BottomNav } from './bottom-nav';
import { SIDEBAR_COOKIE } from './dashboard-nav';
import { Header } from './header';
import { Sidebar } from './sidebar';

/** First in the tab order and visible on focus; lands on the shell's <main id="main">. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:inline-flex focus:h-11 focus:items-center focus:rounded-full focus:bg-ink focus:px-[18px] focus:text-body focus:font-medium focus:text-card-strong"
    >
      Skip to content
    </a>
  );
}

/**
 * DESIGN.md App shell (creator). No frame: everything floats on the page aurora. From 768px the icon rail
 * (72px, or 248px expanded from 1024px) is fixed at the left and the content column (the thin top bar,
 * then <main>) sits 24px to its right with a 24px gutter; the document scrolls. The rail width is the
 * --rail variable on the root, so the column's padding follows it. `[` toggles the rail. Below 768px the rail hides, the column is the page with
 * a 16px gutter, and the floating bottom nav takes over (main's bottom padding clears it).
 *
 * It reads the live data the chrome needs: the space (the server's copy until a refetch, so a settings
 * change shows at once); the top bar's bell reads notifications itself. It also sweeps once per visit,
 * which claims items still waiting for AI analysis (see useSweep).
 */
export function AppShell({
  space: initialSpace,
  defaultExpanded = false,
  children,
}: {
  /** The space the server gate fetched. */
  space: StudioSpace;
  /** The sidebar state from the fo_sidebar cookie, read on the server so the first HTML is right. */
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const { data: space = initialSpace } = useStudioSpace(initialSpace);

  const { mutate: sweep } = useSweep();
  const swept = React.useRef(false);
  React.useEffect(() => {
    // Once per visit, not once per Strict Mode pass.
    if (swept.current) return;
    swept.current = true;
    sweep();
  }, [sweep]);

  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const toggleSidebar = React.useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    try {
      // biome-ignore lint/suspicious/noDocumentCookie: one sync write; the Cookie Store API is async and not in every browser.
      document.cookie = `${SIDEBAR_COOKIE}=${next ? 'expanded' : 'collapsed'}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // Cookies blocked: the toggle still works for this visit.
    }
  }, [expanded]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '[') return;
      if (event.defaultPrevented || event.repeat) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      // Below lg the rail never expands, so there is nothing to toggle.
      if (!window.matchMedia('(min-width: 1024px)').matches) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        if (
          target.isContentEditable ||
          target.closest('input, textarea, select, [contenteditable]')
        ) {
          return;
        }
      }
      event.preventDefault();
      toggleSidebar();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [toggleSidebar]);

  return (
    <div
      data-sidebar={expanded ? 'expanded' : 'collapsed'}
      className="group/shell isolate min-h-svh [--rail:72px] lg:data-[sidebar=expanded]:[--rail:248px]"
    >
      <SkipLink />
      <Sidebar space={space} expanded={expanded} onToggle={toggleSidebar} />
      <div className="flex min-w-0 flex-col gap-6 px-4 pt-3 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pt-4 md:pr-6 md:pb-10 md:pl-[calc(var(--rail)+40px)] md:transition-[padding-left] md:duration-200 md:ease-out-quart motion-reduce:transition-none">
        <Header space={space} />
        <main id="main" tabIndex={-1} className="@container min-w-0 outline-none">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
