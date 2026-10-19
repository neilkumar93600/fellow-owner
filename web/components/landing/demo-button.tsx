'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { enterDemo } from '@/lib/api/demo';
import { ApiError } from '@/lib/fetcher';
import { setAuthHint } from '@/lib/local-state';
import { cn } from '@/lib/utils';

/**
 * "Enter as creator" / "Enter as fan" (F22). Signs into the seeded demo account through the API and follows
 * its redirect. If the API is unreachable, shows the documented "Demo unavailable" toast and stays put;
 * a 429 (many visitors on one network) says when to retry, from Retry-After.
 * `primary` is the Lake Blue pill (at most one per screen), `secondary` the frosted glass pill.
 * Extra props (data-*, aria-*, id, ...) land on the button.
 */
export function DemoButton({
  as,
  variant = as === 'creator' ? 'primary' : 'secondary',
  className,
  children,
  ...rest
}: Omit<React.ComponentProps<'button'>, 'onClick' | 'type'> & {
  as: 'creator' | 'fan';
  variant?: 'primary' | 'secondary';
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
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        toast('Demo busy', {
          description: `Lots of people are trying the demo. Try again ${retryIn(error.retryAfterSeconds)}.`,
        });
      } else {
        toast('Demo unavailable', {
          description: 'The demo is resting right now. Try again in a moment.',
        });
      }
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

/** "in N minutes" from a Retry-After in seconds (rounded up), else "in a few minutes". */
export function retryIn(seconds: number | undefined): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return 'in a few minutes';
  const minutes = Math.ceil(seconds / 60);
  return `in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}
