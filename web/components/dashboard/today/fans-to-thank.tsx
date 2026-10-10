import type { PersonRow } from '@fellow-owners/shared';
import Link from 'next/link';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { GlassPanel } from '@/components/shared/glass-panel';
import { buttonVariants } from '@/components/ui/button-variants';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, pluralize } from '@/lib/format';
import { routes } from '@/lib/routes';

/** "3 ideas · 41 reactions": what this fan gave the communities lately. */
function contributionLine({ contributions: c }: PersonRow): string {
  const parts = [
    c.posts > 0 && `${formatNumber(c.posts)} ${pluralize(c.posts, 'idea')}`,
    c.teams > 0 && `${formatNumber(c.teams)} ${pluralize(c.teams, 'collab')}`,
    c.signalsReceived > 0 &&
      `${formatNumber(c.signalsReceived)} ${pluralize(c.signalsReceived, 'reaction')}`,
    c.comments > 0 && `${formatNumber(c.comments)} ${pluralize(c.comments, 'comment')}`,
  ].filter(Boolean);
  return parts.slice(0, 2).join(' · ') || 'New and getting going';
}

/**
 * DESIGN.md Fans to thank: the fortnight's rising fans (up to 4), each with a Spotlight button that opens
 * their spotlight panel on Fans.
 */
export function FansToThank({ fans }: { fans: PersonRow[] }) {
  const top = fans.slice(0, 4);
  return (
    <GlassPanel as="section" aria-labelledby="fans-to-thank-title" className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="fans-to-thank-title" className="text-label text-ink">
          Fans to thank
        </h2>
        <Link href={routes.dashboard.people()} className="text-small text-sky hover:underline">
          All fans
        </Link>
      </div>
      {top.length === 0 ? (
        <p className="mt-3 text-small text-ink-soft">
          Fans who post, join crews and cheer others on will show up here.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {top.map((fan) => (
            <li key={fan.membershipId} className="flex items-center gap-3">
              <AvatarInitials name={fan.name} image={fan.image} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-label text-ink">{fan.name}</p>
                <p className="truncate text-small text-ink-soft">{contributionLine(fan)}</p>
              </div>
              <Link
                href={routes.dashboard.people({ spotlight: fan.membershipId })}
                aria-label={`Spotlight ${fan.name}`}
                className={buttonVariants({ variant: 'secondary', size: 'md', surface: 'glass' })}
              >
                Spotlight
              </Link>
            </li>
          ))}
        </ul>
      )}
    </GlassPanel>
  );
}

export function FansToThankSkeleton() {
  return (
    <div aria-hidden="true" className="glass flex flex-col gap-4 p-5">
      <Skeleton className="h-5 w-32" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      ))}
    </div>
  );
}
