'use client';

import { PLATFORM_LABELS, type PlatformEntry, type SocialPlatform } from '@fellow-owners/shared';
import { ArrowRight, Globe } from 'lucide-react';
import Link from 'next/link';
import { PlatformIcon } from '@/components/auth/platform-icons';
import { GlassPanel } from '@/components/shared/glass-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudioSpace } from '@/hooks/use-space';
import { formatCompact, formatNumber, formatRelative } from '@/lib/format';
import { routes } from '@/lib/routes';

const manage = (
  <Link
    href={routes.dashboard.settings()}
    className="inline-flex min-h-11 items-center gap-1.5 text-small text-lake hover:text-lake-hover hover:underline"
  >
    Manage platforms
    <ArrowRight aria-hidden className="size-4" />
  </Link>
);

/**
 * Your platforms: total reach across the space's platforms, one row each (icon, compact count, how fresh
 * the number is). Reads the space the shell already loaded; no request of its own.
 */
export function PlatformsCard() {
  const { data: space } = useStudioSpace();
  if (!space) return <PlatformsCardSkeleton />;
  const platforms: PlatformEntry[] = space.platforms ?? [];
  const total = platforms.reduce((sum, p) => sum + p.followers, 0);

  return (
    <GlassPanel as="section" aria-labelledby="platforms-title" className="rounded-panel p-6">
      <h2 id="platforms-title" className="text-caption tracking-wide text-ink-soft uppercase">
        Your platforms
      </h2>
      {platforms.length === 0 ? (
        <>
          <p className="mt-3 text-small text-ink-soft">Add your platforms to see your reach</p>
          <div className="mt-1">{manage}</div>
        </>
      ) : (
        <>
          <p className="mt-2 text-[32px] leading-none text-ink tabular-nums">
            {formatNumber(total)}
          </p>
          <p className="mt-1 text-caption tracking-wide text-ink-soft uppercase">Total followers</p>
          <ul className="mt-4 divide-y divide-line">
            {platforms.map((p) => (
              <li key={`${p.platform}-${p.url}`} className="flex items-center gap-3 py-2.5">
                {p.platform === 'other' ? (
                  <Globe aria-hidden className="size-5 shrink-0 text-ink" />
                ) : (
                  <PlatformIcon platform={p.platform as SocialPlatform} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-small text-ink">{PLATFORM_LABELS[p.platform]}</p>
                  <p className="truncate text-caption text-ink-muted">
                    {p.fetchedAt ? `updated ${formatRelative(p.fetchedAt)}` : 'added by hand'}
                  </p>
                </div>
                <span className="shrink-0 text-label text-ink tabular-nums">
                  {formatCompact(p.followers)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-1">{manage}</div>
        </>
      )}
    </GlassPanel>
  );
}

export function PlatformsCardSkeleton() {
  return (
    <div aria-hidden="true" className="glass flex flex-col gap-3 rounded-panel p-6">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
