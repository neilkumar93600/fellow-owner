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
 * Tab bar: a 64px frosted glass pill of URL links (tabs live in ?tab=, so they are links with
 * aria-current, not ARIA tabs). Tabs are 48px mono caps pills. Inactive: ink-soft, a white wash on hover.
 * Active: a periwinkle chip with a hairline, ink. Overflow scrolls sideways
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
            'press relative flex h-12 shrink-0 items-center rounded-full border px-4 text-small tracking-tight whitespace-nowrap uppercase',
            tab.active
              ? 'border-line bg-periwinkle font-medium text-ink'
              : 'border-transparent text-ink-soft hover:bg-white/50 hover:text-ink',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
