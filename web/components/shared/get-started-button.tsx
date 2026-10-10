import Link from 'next/link';
import type * as React from 'react';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { RainbowLink } from '@/components/ui/rainbow-button';
import { routes } from '@/lib/routes';

/**
 * The one "Get started" button the owner allows in the navbar and the hero. It always points at
 * /start, which sends signed-in visitors straight into the app (Today or onboarding) and everyone
 * else to create account, so the button never needs to know the session itself.
 * - `rainbow`: the marketing primary (at most one rainbow per viewport).
 * - `glass`: the quiet twin, e.g. the navbar while the hero's rainbow button is on screen.
 * Extra props (data-hero-cta, aria-*) pass through to the link.
 */
export function GetStartedButton({
  variant = 'rainbow',
  size = 'default',
  handle,
  className,
  children = 'Get started',
  ...rest
}: {
  variant?: 'rainbow' | 'glass';
  size?: 'default' | 'lg';
  handle?: string | null;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<'a'>, 'href' | 'children' | 'className'>) {
  const href = routes.start(handle);
  if (variant === 'rainbow') {
    return (
      <RainbowLink href={href} size={size} className={className} {...rest}>
        {children}
      </RainbowLink>
    );
  }
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: 'secondary', size: size === 'lg' ? 'lg' : 'md' }),
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}
