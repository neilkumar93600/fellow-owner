'use client';

import type { NotificationKind } from '@fellow-owners/shared';
import { Heart, type LucideIcon, Sparkles, Star, Trophy } from 'lucide-react';
import Link from 'next/link';
import { GlassPanel } from '@/components/shared/glass-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotifications } from '@/hooks/queries/use-notifications';
import { formatRelative } from '@/lib/format';

/** The notification kinds that are good news about the fan's own work, each with its icon and tile tint. */
const MOMENTS: Partial<Record<NotificationKind, { icon: LucideIcon; tile: string; ink: string }>> =
  {
    post_loved: { icon: Heart, tile: 'bg-aurora-peach', ink: 'fill-coral text-coral' },
    project_featured: { icon: Star, tile: 'bg-aurora-sky', ink: 'text-[#2b6ca8]' },
    spotlighted: { icon: Sparkles, tile: 'bg-aurora-lilac', ink: 'text-[#5b47a8]' },
    challenge_shortlisted: { icon: Trophy, tile: 'bg-aurora-mint', ink: 'text-[#22694f]' },
  };

/**
 * "Your moments": the times the creator loved, featured, spotlighted or shortlisted something of the
 * fan's, read from their notifications (this space only), newest first, each a link to where it
 * happened. ponytail: the first page of notifications only (20); a fan with more than that between two
 * moments sees fewer, so add "load more" if that ever shows up.
 */
export function YourMoments({ handle }: { handle: string }) {
  const { items, isLoading, isError } = useNotifications(handle, true);
  const moments = items.filter((item) => item.kind in MOMENTS).slice(0, 6);

  if (isError && moments.length === 0) return null;
  return (
    <section aria-labelledby="moments-title" className="flex flex-col gap-3">
      <h2 id="moments-title" className="font-display text-[1.75rem] leading-[1.15] text-ink">
        Your moments
      </h2>
      {isLoading ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only" role="status">
            Loading your moments
          </span>
          <Skeleton className="h-20 rounded-panel" />
          <Skeleton className="h-20 rounded-panel" />
        </div>
      ) : moments.length === 0 ? (
        <GlassPanel className="p-5">
          <p className="text-body text-ink">
            Nothing yet. When the creator loves, features or spotlights something you made, it lands
            here.
          </p>
        </GlassPanel>
      ) : (
        <ul className="flex flex-col gap-3">
          {moments.map((item) => {
            const moment = MOMENTS[item.kind];
            if (!moment) return null;
            const Icon = moment.icon;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="glass press flex min-h-16 items-center gap-4 p-4 hover:bg-white/80"
                >
                  <span
                    aria-hidden="true"
                    className={`grid size-11 shrink-0 place-items-center rounded-2xl ${moment.tile}`}
                  >
                    <Icon strokeWidth={1.5} className={`size-5 ${moment.ink}`} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-body text-ink">{item.text}</span>
                    <time
                      dateTime={item.createdAt}
                      suppressHydrationWarning
                      className="text-caption text-ink-soft"
                    >
                      {formatRelative(item.createdAt)}
                    </time>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
