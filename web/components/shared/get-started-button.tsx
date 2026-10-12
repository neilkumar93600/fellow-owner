import Link from 'next/link';
import type * as React from 'react';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { routes } from '@/lib/routes';

/**
 * The one "Get started" button the owner allows in the navbar and the hero. It always points at
 * /start, which sends signed-in visitors straight into the app (Today or onboarding) and everyone
 * else to create account, so the button never needs to know the session itself.
 * - `primary`: the Lake Blue action (at most one per viewport).
 * - `glass`: the quiet twin, e.g. the navbar while the hero's Lake Blue button is on screen.
 * Extra props (data-hero-cta, aria-*) pass through to the link.
 */
export function GetStartedButton({
  variant = 'primary',
  size = 'default',
  handle,
  className,
  children = 'Get started',
  ...rest
}: {
  variant?: 'primary' | 'glass';
  size?: 'default' | 'lg';
  handle?: string | null;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<'a'>, 'href' | 'children' | 'className'>) {
  const href = routes.start(handle);
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({
          variant: variant === 'primary' ? 'primary' : 'secondary',
          size: size === 'lg' ? 'lg' : 'md',
        }),
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}
