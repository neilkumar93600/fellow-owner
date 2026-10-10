import type { LucideIcon } from 'lucide-react';
import {
  CircleHelp,
  HeartHandshake,
  Lightbulb,
  Mail,
  Settings,
  Sparkles,
  Sun,
  Trophy,
  Users,
} from 'lucide-react';
import { routes } from '@/lib/routes';

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  id: string;
  /** The expanded rail's heading; null for the ungrouped tail (Settings). */
  label: string | null;
  items: readonly DashboardNavItem[];
}

/** The creator rail as the expanded sidebar groups it. */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: 'daily',
    label: 'Daily',
    items: [
      { href: routes.dashboard.today(), label: 'Today', icon: Sun },
      { href: routes.dashboard.inbox(), label: 'Fan mail', icon: Mail },
      { href: routes.dashboard.ideas(), label: 'Ideas', icon: Lightbulb },
    ],
  },
  {
    id: 'community',
    label: 'Community',
    items: [
      {
        href: routes.dashboard.communities(),
        label: 'Communities',
        icon: Users,
      },
      {
        href: routes.dashboard.challenges(),
        label: 'Challenges',
        icon: Trophy,
      },
      { href: routes.dashboard.people(), label: 'Fans', icon: HeartHandshake },
    ],
  },
  {
    id: 'grow',
    label: 'Grow',
    items: [{ href: routes.dashboard.promote(), label: 'Spotlight', icon: Sparkles }],
  },
  {
    id: 'settings',
    label: null,
    items: [{ href: routes.dashboard.settings(), label: 'Settings', icon: Settings }],
  },
];

/**
 * The creator rail, in order (the groups flattened). The phone bottom nav keeps four of them plus a
 * More menu holding the rest, Help and Sign out.
 */
export const DASHBOARD_NAV: readonly DashboardNavItem[] = NAV_GROUPS.flatMap(
  (group) => group.items,
);

/** The sidebar's remembered state: a cookie, so the server renders the right width on the first byte. */
export const SIDEBAR_COOKIE = 'fo_sidebar';

/** Only the exact value "expanded" expands; a missing or unknown value (a tampered cookie) collapses. */
export function isSidebarExpanded(cookieValue: string | undefined): boolean {
  return cookieValue === 'expanded';
}

/** Bottom of the rail, beside the avatar. */
export const HELP_NAV: DashboardNavItem = {
  href: routes.marketing.contact(),
  label: 'Help',
  icon: CircleHelp,
};

/** Links that cannot run code (menus owned elsewhere) go here: /sign-out ends the session, then /login. */
export const SIGN_OUT_HREF = routes.auth.signOut();

/** Today is current on /dashboard only; every other item also owns the paths under it. */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === routes.dashboard.today()) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The top bar's title: the rail label owning this path ("Fans" on /dashboard/people/followers). */
export function navTitle(pathname: string): string {
  // Fan mail's sub-page has a name of its own.
  if (pathname.startsWith(routes.dashboard.questions())) return 'What fans want';
  return DASHBOARD_NAV.find((item) => isNavActive(pathname, item.href))?.label ?? 'Your studio';
}
