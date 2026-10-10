'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/shared/logo';
import { cn } from '@/components/ui/cn';
import { Tooltip } from '@/components/ui/tooltip';
import { useMediaQuery } from '@/hooks/use-media-query';
import { routes } from '@/lib/routes';
import { type DashboardNavItem, HELP_NAV, isNavActive, NAV_GROUPS } from './dashboard-nav';
import { AccountMenu, type HeaderSpace } from './header';

/**
 * DESIGN.md Icon rail (creator, 768px and up): a frosted column floating 16px from the left, top and
 * bottom edges. Collapsed (72px, the default): the mark on top, the rooms as 44px round icon buttons with
 * their name in a right-hand tooltip (and kept as the link's name, sr-only), a hairline between groups,
 * Help and the avatar menu at the foot. Expanded (248px, 1024px and up, remembered in a cookie): rows are
 * 44px pills with their label, groups get small headings, and the foot adds the name and handle. Icons
 * keep the same x slot in both. The current room is a soft aurora-peach (#FFD9C2) chip with a coral
 * icon (3.7:1 on peach, AA for icons) and an ink label (12.9:1), and no dot.
 *
 * Which look applies is pure CSS on the shell's data-sidebar (see AppShell), so below 1024px an expanded
 * cookie still shows the 72px rail and the server HTML never disagrees with the client.
 */
export function Sidebar({
  space,
  expanded,
  onToggle,
  className,
}: {
  space: HeaderSpace;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  // Labels carry the names once expanded, so the tooltips would only repeat them. Below lg the rail is
  // always the icon rail, whatever the cookie says.
  const wide = useMediaQuery('(min-width: 1024px)');
  const tipsOff = expanded && wide;
  return (
    <aside
      className={cn(
        'glass-strong fixed inset-y-4 left-4 z-40 hidden w-[var(--rail)] flex-col px-3.5 py-4 md:flex',
        'transition-[width] duration-200 ease-out-quart motion-reduce:transition-none',
        className,
      )}
    >
      <Link
        href={routes.dashboard.today()}
        aria-label="Fellow Owners, Today"
        className="flex h-11 w-full shrink-0 items-center overflow-hidden rounded-full pl-[5px]"
      >
        <Logo
          withWordmark
          className="[&>span]:hidden lg:group-data-[sidebar=expanded]/shell:[&>span]:inline"
        />
      </Link>
      <EdgeToggle expanded={expanded} onToggle={onToggle} />
      <nav
        id="sidebar-nav"
        aria-label="Main"
        className="-mx-1.5 mt-6 min-h-0 flex-1 [scrollbar-width:none] overflow-x-hidden overflow-y-auto px-1.5 py-1"
      >
        {NAV_GROUPS.map((group, index) => {
          const headingId = `sidebar-group-${group.id}`;
          return (
            <div
              key={group.id}
              className={cn(
                index > 0 && 'mt-2',
                index > 0 && group.label && 'lg:group-data-[sidebar=expanded]/shell:mt-5',
              )}
            >
              {group.label ? (
                <p
                  id={headingId}
                  className="sr-only pl-3.5 text-[11px] leading-4 font-medium tracking-[0.08em] whitespace-nowrap text-ink-soft uppercase lg:group-data-[sidebar=expanded]/shell:not-sr-only lg:group-data-[sidebar=expanded]/shell:mb-1 lg:group-data-[sidebar=expanded]/shell:block"
                >
                  {group.label}
                </p>
              ) : null}
              {index > 0 ? (
                <div
                  aria-hidden="true"
                  className={cn(
                    'mx-2 mb-2 h-px bg-ink/10',
                    group.label ? 'lg:group-data-[sidebar=expanded]/shell:hidden' : null,
                  )}
                />
              ) : null}
              <ul
                aria-labelledby={group.label ? headingId : undefined}
                className="flex flex-col gap-2"
              >
                {group.items.map((item) => (
                  <li key={item.href}>
                    <RailLink
                      item={item}
                      active={isNavActive(pathname, item.href)}
                      tipsOff={tipsOff}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="mt-4 flex flex-col gap-2">
        <RailLink item={HELP_NAV} active={false} tipsOff={tipsOff} />
        <div className="flex h-11 items-center overflow-hidden">
          <AccountMenu space={space} />
          <div className="hidden min-w-0 pr-2 pl-0.5 leading-tight lg:group-data-[sidebar=expanded]/shell:block">
            <p className="truncate text-label text-ink">{space.displayName}</p>
            <p className="truncate text-caption text-ink-soft">@{space.handle}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

/** The label: the link's name when collapsed (sr-only, never display:none), visible text when expanded. */
const labelClass =
  'sr-only whitespace-nowrap overflow-hidden text-ellipsis pr-4 text-label lg:group-data-[sidebar=expanded]/shell:not-sr-only';

const rowClass =
  'press relative flex h-11 w-full items-center overflow-hidden rounded-full transition-colors duration-150 ease-out-quart';

function RailLink({
  item: { href, label, icon: Icon },
  active,
  tipsOff,
}: {
  item: DashboardNavItem;
  active: boolean;
  tipsOff: boolean;
}) {
  return (
    <Tooltip content={label} side="right" describe={false} disabled={tipsOff}>
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          rowClass,
          active
            ? 'glass-chip bg-aurora-peach text-ink'
            : 'text-ink-soft hover:bg-white/60 hover:text-ink',
        )}
      >
        <span className="grid size-11 shrink-0 place-items-center">
          <Icon
            aria-hidden
            className={cn('size-5', active && 'text-coral')}
            strokeWidth={active ? 2 : 1.6}
          />
        </span>
        <span className={labelClass}>{label}</span>
      </Link>
    </Tooltip>
  );
}

/**
 * From lg only: a small round button riding the rail's right edge just under the mark, so it stays put
 * whether the rail is 72px or 248px. 28px visible, with a 44px invisible hit area. The name stays
 * "Sidebar"; aria-expanded says which way it will go, and the chevron points that way.
 */
function EdgeToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const Icon = expanded ? ChevronLeft : ChevronRight;
  return (
    <div className="absolute top-15.5 -right-3.5 z-10 hidden lg:block">
      <Tooltip
        content={expanded ? 'Collapse sidebar ([)' : 'Expand sidebar ([)'}
        side="right"
        describe={false}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-label="Sidebar"
          aria-expanded={expanded}
          aria-controls="sidebar-nav"
          aria-keyshortcuts="["
          className="relative grid size-7 press place-items-center rounded-full border border-white/80 bg-white/90 text-ink-soft shadow-glass transition-colors duration-150 ease-out-quart before:absolute before:-inset-2 before:content-[''] hover:bg-white hover:text-ink"
        >
          <Icon aria-hidden className="size-4" strokeWidth={2} />
        </button>
      </Tooltip>
    </div>
  );
}
