'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { enterDemo } from '@/lib/api/demo';
import { setAuthHint } from '@/lib/local-state';
import { cn } from '@/lib/utils';

/**
 * "Enter as creator" / "Enter as fan" (F22). Signs into the seeded demo account through the API and follows
 * its redirect. If the API is unreachable, shows the documented "Demo unavailable" toast and stays put.
 * variant 'rainbow' is the marketing primary: the dark pill over the aurora. 'rainbow-outline' is the light
 * pill for glass. Use at most one rainbow button per viewport; the app keeps coral.
 * Extra props (data-*, aria-*, id, ...) land on the button.
 */
export function DemoButton({
  as,
  variant = as === 'creator' ? 'primary' : 'secondary',
  size,
  className,
  children,
  ...rest
}: Omit<React.ComponentProps<'button'>, 'onClick' | 'type'> & {
  as: 'creator' | 'fan';
  variant?: 'primary' | 'secondary' | 'rainbow' | 'rainbow-outline';
  /** Rainbow variants only. */
  size?: 'default' | 'lg';
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (pending) return;
    setPending(true);
    try {
      const session = await enterDemo(as);
      setAuthHint(as);
      router.push(session.redirectTo);
    } catch {
      toast('Demo unavailable', {
        description: 'The demo is resting right now. Try again in a moment.',
      });
      setPending(false);
    }
  }

  const content = (
    <>
      {pending ? (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      ) : null}
      {children ?? (as === 'creator' ? 'Enter as creator' : 'Enter as fan')}
    </>
  );

  if (variant === 'rainbow' || variant === 'rainbow-outline') {
    return (
      <RainbowButton
        {...rest}
        onClick={onClick}
        aria-busy={pending}
        variant={variant === 'rainbow' ? 'default' : 'outline'}
        size={size}
        className={cn(pending && 'cursor-progress', className)}
      >
        {content}
      </RainbowButton>
    );
  }

  return (
    <button
      {...rest}
      type="button"
      onClick={onClick}
      aria-busy={pending}
      className={cn('btn', `btn-${variant}`, pending && 'cursor-progress', className)}
    >
      {content}
    </button>
  );
}
