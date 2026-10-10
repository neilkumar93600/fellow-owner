'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';

export interface NotificationBellProps
  extends Omit<React.ComponentProps<typeof Button>, 'children' | 'variant' | 'surface'> {
  unreadCount: number;
  isOpen?: boolean;
}

/**
 * A bell icon button with an unread badge. To be wrapped by a Popover trigger, which hands it
 * its ref, click and aria props: they are passed on to the button.
 * DESIGN.md: part of the frosted strip in the fan top bar; the unread badge is coral with white words.
 */
export function NotificationBell({
  unreadCount,
  isOpen,
  className,
  ...props
}: NotificationBellProps) {
  return (
    <Button
      {...props}
      variant="ghost"
      surface={isOpen ? 'card' : 'glass'}
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      className={className}
    >
      <Bell />
      {unreadCount > 0 ? (
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full',
            'bg-coral px-1 text-caption text-white',
          )}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </Button>
  );
}
