'use client';

import { Ellipsis, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/components/ui/cn';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLinkItem,
  MenuSeparator,
  MenuTrigger,
} from '@/components/ui/menu';
import { useSignOut } from '@/hooks/use-sign-out';
import { DASHBOARD_NAV, HELP_NAV, isNavActive } from './dashboard-nav';

/** 52px cells, icon over a caption: five icon and label pairs side by side do not fit a 360px phone. */
const ITEM =
  'press relative flex h-13 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] px-0.5 text-[11px] leading-4 font-medium';
const CURRENT = 'glass-chip rounded-[20px] bg-white/90 text-ink';
const IDLE = 'text-ink-soft';

/** The four rooms a phone needs most (and whose names fit a fifth of a 360px dock). */
const PHONE_ROOMS = ['Today', 'Fan mail', 'Ideas', 'Challenges'];

/** The current item's 3px sunset dot, under its label. */
function Dot() {
  return (
    <span
      aria-hidden="true"
      className="absolute bottom-1 left-1/2 size-[3px] -translate-x-1/2 rounded-full bg-sunset"
    />
  );
}

/**
 * Bottom nav (below 768px): a floating frosted dock 12px from the screen edges plus the safe area. The
 * four rooms a phone needs most, then More (the other rooms, Help and Sign out). The current item is the rail's
 * white glass chip with the sunset dot.
 */
export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const signOut = useSignOut();
  const primary = DASHBOARD_NAV.filter((item) => PHONE_ROOMS.includes(item.label));
  const more = [...DASHBOARD_NAV.filter((item) => !PHONE_ROOMS.includes(item.label)), HELP_NAV];
  const moreActive = more.some((item) => isNavActive(pathname, item.href));

  return (
    <nav
      aria-label="Main"
      className={cn(
        'glass-strong fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-1 rounded-[28px] p-1.5 md:hidden',
        className,
      )}
    >
      {primary.map(({ href, label, icon: Icon }) => {
        const active = isNavActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(ITEM, active ? CURRENT : IDLE)}
          >
            <Icon aria-hidden className="size-5 shrink-0" strokeWidth={active ? 2 : 1.6} />
            <span className="max-w-full truncate">{label}</span>
            {active ? <Dot /> : null}
          </Link>
        );
      })}
      <Menu>
        <MenuTrigger
          className={cn(ITEM, moreActive ? CURRENT : cn(IDLE, 'data-popup-open:bg-white/60'))}
        >
          <Ellipsis aria-hidden className="size-5 shrink-0" strokeWidth={1.6} />
          More
          {moreActive ? <Dot /> : null}
        </MenuTrigger>
        <MenuContent side="top">
          {more.map(({ href, label, icon: Icon }) => (
            <MenuLinkItem
              key={href}
              icon={<Icon />}
              aria-current={isNavActive(pathname, href) ? 'page' : undefined}
              render={<Link href={href} />}
              className="h-11 aria-[current=page]:font-semibold"
            >
              {label}
            </MenuLinkItem>
          ))}
          <MenuSeparator />
          <MenuItem icon={<LogOut />} onClick={() => void signOut()} className="h-11">
            Sign out
          </MenuItem>
        </MenuContent>
      </Menu>
    </nav>
  );
}
