'use client';

import type { StudioSpace } from '@fellow-owners/shared';
import {
  Eye,
  HeartHandshake,
  Lightbulb,
  Link2,
  LogOut,
  Mail,
  Search,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { NotificationBell, NotificationPopoverContent } from '@/components/notifications';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { InputGroup, TextField } from '@/components/ui/field';
import { Menu, MenuContent, MenuLinkItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications, useUnreadCount } from '@/hooks/queries/use-notifications';
import { routes } from '@/lib/routes';
import { navTitle, SIGN_OUT_HREF } from './dashboard-nav';

export type HeaderSpace = Pick<
  StudioSpace,
  'handle' | 'displayName' | 'ownerName' | 'avatarUrl' | 'isDemo'
>;

export interface HeaderProps {
  space: HeaderSpace;
  className?: string;
}

/**
 * DESIGN.md Top bar (creator): a thin frosted strip that sticks 16px below the top of the window. The
 * page title in the display serif (the rail label of this path; it is not a heading, every page owns an
 * sr-only h1), then search, the bell and "View as fan". Phones swap the title for the logo and add the avatar
 * menu, which lives at the foot of the rail from 768px.
 */
export function Header({ space, className }: HeaderProps) {
  const pathname = usePathname();
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadQuery = useUnreadCount();
  const notificationsQuery = useNotifications(null, notifOpen);

  return (
    <header
      className={cn(
        'glass sticky top-3 z-30 flex h-16 items-center gap-2 rounded-chip pr-2 pl-4 md:top-4 md:pl-6',
        className,
      )}
    >
      <Link href={routes.dashboard.today()} aria-label="Fellow Owners, Today" className="md:hidden">
        <Logo withWordmark={false} />
      </Link>
      <p className="hidden min-w-0 truncate font-display text-[28px] leading-none text-ink md:block">
        {navTitle(pathname)}
      </p>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <SearchPopover />
        <NotificationBellPopover
          unreadCount={unreadQuery.data?.unread ?? 0}
          isOpen={notifOpen}
          onOpenChange={setNotifOpen}
          notifications={notificationsQuery}
        />
        <Link
          href={routes.fan.space(space.handle)}
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'md', surface: 'glass' }),
            'ml-1 max-sm:w-10 max-sm:px-0',
          )}
        >
          <Eye aria-hidden />
          <span className="max-sm:sr-only">View as fan</span>
        </Link>
        <AccountMenu space={space} className="ml-1 md:hidden" />
      </div>
    </header>
  );
}

/** The notification bell with popover, showing recent notifications and "mark all read". */
interface NotificationBellPopoverProps {
  unreadCount: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: ReturnType<typeof useNotifications>;
}

function NotificationBellPopover({
  unreadCount,
  isOpen,
  onOpenChange,
  notifications,
}: NotificationBellPopoverProps) {
  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger render={<NotificationBell isOpen={isOpen} unreadCount={unreadCount} />} />
      <PopoverContent className="w-80">
        <NotificationPopoverContent
          items={notifications.items}
          unreadCount={unreadCount}
          hasNextPage={notifications.hasNextPage}
          isFetchingNextPage={notifications.isFetchingNextPage}
          isLoading={notifications.isLoading}
          isError={notifications.isError}
          onLoadMore={notifications.fetchNextPage}
          onOpenChange={onOpenChange}
        />
      </PopoverContent>
    </Popover>
  );
}

/** A search box plus three scopes; Enter searches fan mail. Each scope link carries the query as ?q=. */
function SearchPopover() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim();
  const scopes = [
    { label: 'Search fan mail', href: routes.dashboard.inbox({ q }), icon: Mail },
    { label: 'Search community ideas', href: routes.dashboard.ideas({ q }), icon: Lightbulb },
    { label: 'Search fans', href: routes.dashboard.people({ q }), icon: HeartHandshake },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" surface="glass" aria-label="Search" />}>
        <Search />
      </PopoverTrigger>
      <PopoverContent aria-label="Search" className="w-80">
        <search>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setOpen(false);
              router.push(scopes[0].href);
            }}
          >
            <InputGroup leading={<Search />}>
              <TextField
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search fan mail, community ideas and fans"
                placeholder="Search your studio"
                enterKeyHint="search"
              />
            </InputGroup>
          </form>
        </search>
        <ul className="mt-2">
          {scopes.map(({ label, href, icon: Icon }) => (
            <li key={label}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className="flex h-10 items-center gap-3 rounded-sm px-3 text-body text-ink transition-colors duration-150 ease-out-quart hover:bg-cream"
              >
                <Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** The avatar and its menu: the bio link, Settings, Sign out. */
export function AccountMenu({ space, className }: { space: HeaderSpace; className?: string }) {
  return (
    <Menu>
      <MenuTrigger
        aria-label={`Your account, ${space.displayName}`}
        className={cn(
          'press relative grid size-11 shrink-0 place-items-center rounded-full',
          className,
        )}
      >
        <AvatarInitials name={space.displayName} image={space.avatarUrl} size={40} />
      </MenuTrigger>
      <MenuContent>
        <MenuLinkItem icon={<Link2 />} render={<Link href={routes.fan.space(space.handle)} />}>
          View your bio page
        </MenuLinkItem>
        <MenuLinkItem icon={<Settings />} render={<Link href={routes.dashboard.settings()} />}>
          Settings
        </MenuLinkItem>
        <MenuSeparator />
        <MenuLinkItem icon={<LogOut />} render={<Link href={SIGN_OUT_HREF} />}>
          Sign out
        </MenuLinkItem>
      </MenuContent>
    </Menu>
  );
}
