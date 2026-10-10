'use client';

import type { PublicCommunity, PublicSpace, ViewerMembership } from '@fellow-owners/shared';
import { LayoutGrid, LogOut, Send, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { NotificationBell, NotificationPopoverContent } from '@/components/notifications';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { Menu, MenuContent, MenuLinkItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications, useUnreadCount } from '@/hooks/queries/use-notifications';
import { routes } from '@/lib/routes';
import { SIGN_OUT_HREF } from './dashboard-nav';

export interface FanTopbarProps {
  space: Pick<PublicSpace, 'handle' | 'displayName' | 'avatarUrl'>;
  communities: Pick<PublicCommunity, 'id' | 'slug' | 'name'>[];
  viewer: ViewerMembership;
  className?: string;
}

/**
 * DESIGN.md Fan top bar: the creator (avatar and name, back to the bio link) and the viewer's avatar
 * menu in one frosted strip, then the community switcher as horizontal glass pills; the current
 * community is a white chip with Label Strong, a 3px sunset dot and aria-current, and is scrolled into
 * view. It scrolls with the page and never sticks. Every control is 44px.
 */
export function FanTopbar({ space, communities, viewer, className }: FanTopbarProps) {
  const pathname = usePathname();
  const bandRef = useRef<HTMLUListElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadQuery = useUnreadCount(space.handle);
  const notificationsQuery = useNotifications(space.handle, notifOpen);

  // Centre the current pill in the band without scrolling the page (scrollIntoView would).
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when the page changes.
  useEffect(() => {
    const band = bandRef.current;
    const current = band?.querySelector('[aria-current="page"]');
    if (!band || !current) return;
    const b = band.getBoundingClientRect();
    const c = current.getBoundingClientRect();
    band.scrollLeft += c.left - b.left - (b.width - c.width) / 2;
  }, [pathname]);

  return (
    <div className={cn('mb-6 flex flex-col gap-3', className)}>
      <div className="glass flex items-center justify-between gap-3 rounded-full p-1.5">
        <Link
          href={routes.fan.space(space.handle)}
          className="press inline-flex h-11 min-w-0 items-center gap-3 rounded-full pr-4 pl-1 hover:bg-white/60"
        >
          <AvatarInitials name={space.displayName} image={space.avatarUrl} size={40} />
          <span className="truncate text-label-strong text-ink">{space.displayName}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger
              render={
                <NotificationBell
                  size="icon-fan"
                  isOpen={notifOpen}
                  unreadCount={unreadQuery.data?.unread ?? 0}
                />
              }
            />
            <PopoverContent className="w-80">
              <NotificationPopoverContent
                items={notificationsQuery.items}
                unreadCount={unreadQuery.data?.unread ?? 0}
                hasNextPage={notificationsQuery.hasNextPage}
                isFetchingNextPage={notificationsQuery.isFetchingNextPage}
                isLoading={notificationsQuery.isLoading}
                isError={notificationsQuery.isError}
                space={space.handle}
                onLoadMore={notificationsQuery.fetchNextPage}
                onOpenChange={setNotifOpen}
              />
            </PopoverContent>
          </Popover>
          <ViewerMenu space={space} viewer={viewer} />
        </div>
      </div>
      <nav aria-label={`${space.displayName}'s communities`}>
        <ul ref={bandRef} className="scrollbar-band -m-1 flex gap-2 p-1">
          {communities.map((community) => {
            const href = routes.fan.community(space.handle, community.slug);
            const current = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={community.id} className="shrink-0">
                <Link
                  href={href}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'press relative inline-flex h-11 items-center rounded-full px-4 whitespace-nowrap text-ink',
                    // The active dot: 3px sunset under the word, the same cue as the tab bar.
                    'after:absolute after:bottom-1 after:left-1/2 after:size-[3px] after:-translate-x-1/2 after:rounded-full after:bg-sunset',
                    current
                      ? 'glass-chip bg-white/90 text-label-strong'
                      : 'glass-chip text-label after:hidden hover:bg-white/85',
                  )}
                >
                  {community.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/** Members get My space and Send an idea; the owner gets the way back to the studio; others get Join. */
function ViewerMenu({ space, viewer }: Pick<FanTopbarProps, 'space' | 'viewer'>) {
  const name = viewer.membership?.name ?? (viewer.isOwner ? space.displayName : null);
  if (!name) {
    return (
      <Link
        href={routes.fan.join(space.handle)}
        className={cn(buttonVariants({ variant: 'secondary', surface: 'glass' }), 'h-11')}
      >
        Join
      </Link>
    );
  }

  return (
    <Menu>
      <MenuTrigger
        aria-label={`Your account, ${name}`}
        className="press grid size-11 shrink-0 place-items-center rounded-full hover:bg-white/60 data-popup-open:bg-white/60"
      >
        <AvatarInitials name={name} image={viewer.isOwner ? space.avatarUrl : null} size={40} />
      </MenuTrigger>
      <MenuContent>
        {viewer.isOwner ? (
          <MenuLinkItem
            icon={<LayoutGrid />}
            render={<Link href={routes.dashboard.today()} />}
            className="h-11"
          >
            Back to your studio
          </MenuLinkItem>
        ) : (
          <>
            <MenuLinkItem
              icon={<UserRound />}
              render={<Link href={routes.fan.me(space.handle)} />}
              className="h-11"
            >
              My space
            </MenuLinkItem>
            <MenuLinkItem
              icon={<Send />}
              render={<Link href={routes.fan.pitch(space.handle)} />}
              className="h-11"
            >
              Send an idea
            </MenuLinkItem>
          </>
        )}
        <MenuSeparator />
        <MenuLinkItem icon={<LogOut />} render={<Link href={SIGN_OUT_HREF} />} className="h-11">
          Sign out
        </MenuLinkItem>
      </MenuContent>
    </Menu>
  );
}
