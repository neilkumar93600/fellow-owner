'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { cn } from '@/components/ui/cn';

export interface TabBarTab {
  href: string;
  label: string;
  active: boolean;
}

export interface TabBarProps {
  /** The nav's accessible name: "Inbox views". */
  label: string;
  tabs: TabBarTab[];
  className?: string;
}

/**
 * DESIGN.md Tab bar: a 64px frosted glass pill of URL links (tabs live in ?tab=, so they are links with
 * aria-current, not ARIA tabs). Tabs are 48px pills. Inactive: Body ink-soft, a white wash on hover.
 * Active: a white glass chip, Label ink, with a 3px sunset dot under the word. Overflow scrolls sideways
 * and the active tab is scrolled into view.
 */
export function TabBar({ label, tabs, className }: TabBarProps) {
  const navRef = useRef<HTMLElement>(null);
  const activeHref = tabs.find((tab) => tab.active)?.href;

  useEffect(() => {
    const nav = navRef.current;
    const tab = activeHref ? nav?.querySelector<HTMLElement>('[aria-current="page"]') : null;
    if (!nav || !tab) return;
    // Scroll the band only, never the page (scrollIntoView would).
    const start = tab.offsetLeft - 24;
    const end = tab.offsetLeft + tab.offsetWidth + 24;
    if (start < nav.scrollLeft) nav.scrollLeft = start;
    else if (end > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = end - nav.clientWidth;
  }, [activeHref]);

  return (
    <nav
      ref={navRef}
      aria-label={label}
      className={cn(
        'glass scrollbar-band relative flex h-16 items-center gap-1 rounded-full px-2',
        className,
      )}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? 'page' : undefined}
          className={cn(
            'press relative flex h-12 shrink-0 items-center rounded-full px-4 whitespace-nowrap',
            // The active dot: 3px sunset, centred 6px above the pill's bottom edge.
            'after:absolute after:bottom-1.5 after:left-1/2 after:size-[3px] after:-translate-x-1/2 after:rounded-full after:bg-sunset after:transition-opacity after:duration-200',
            tab.active
              ? 'bg-white/85 text-label text-ink shadow-[inset_1px_1px_0_rgb(255_255_255/0.9),0_6px_18px_-10px_rgb(40_30_60/0.3)] after:opacity-100'
              : 'text-body text-ink-soft after:opacity-0 hover:bg-white/50 hover:text-ink',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
