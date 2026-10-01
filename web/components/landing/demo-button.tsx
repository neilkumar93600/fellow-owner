'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { enterDemo } from '@/api/demo';
import { cn } from '@/lib/utils';

/**
 * "Enter as creator" / "Enter as fan" (F22). Signs into the seeded demo account through the API and follows
 * its redirect. If the API is unreachable, shows the documented "Demo unavailable" toast and stays put.
 */
export function DemoButton({
  as,
  variant = as === 'creator' ? 'primary' : 'secondary',
  className,
  children,
}: {
  as: 'creator' | 'fan';
  variant?: 'primary' | 'secondary' | 'lime';
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (pending) return;
    setPending(true);
    try {
      const session = await enterDemo(as);
      router.push(session.redirectTo);
    } catch {
      toast('Demo unavailable', {
        description: 'The demo is resting right now. Try again in a moment.',
      });
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-busy={pending}
      className={cn('btn', `btn-${variant}`, pending && 'cursor-progress', className)}
    >
      {pending ? (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      ) : null}
      {children ?? (as === 'creator' ? 'Enter as creator' : 'Enter as fan')}
    </button>
  );
}
