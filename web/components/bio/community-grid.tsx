import type { PublicCommunity } from '@fellow-owners/shared';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { formatNumber, pluralize } from '@/lib/format';
import { routes, withQuery } from '@/lib/routes';
import { CommunityCover } from './community-cover';

export interface CommunityGridProps {
  handle: string;
  communities: PublicCommunity[];
  /** The viewer's communities in this space; empty for visitors. */
  joinedIds: readonly string[];
}

/**
 * "Pick a room": photo-cover cards, two columns from a 576px column (one on phones). Each carries the
 * room's cover, its name, the fan count (one small line: the count never outgrows the name) and a
 * description, then a real link: Join opens the join flow with that community preselected, Open goes in.
 */
export function CommunityGrid({ handle, communities, joinedIds }: CommunityGridProps) {
  return (
    <section aria-labelledby="bio-communities" className="flex flex-col gap-4">
      <h2 id="bio-communities" className="font-display text-[2rem] leading-[1.15] text-ink">
        Pick a room
      </h2>
      <ul className="grid gap-4 @xl:grid-cols-2">
        {communities.map((community) => {
          const joined = joinedIds.includes(community.id);
          return (
            <li key={community.id} className="flex min-w-0">
              <article className="glass flex w-full flex-col overflow-hidden">
                <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden">
                  <CommunityCover
                    slug={community.slug}
                    name={community.name}
                    tint={community.tint}
                    icon={community.icon}
                    sizes="(min-width: 576px) 380px, 100vw"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-h2 text-ink">{community.name}</h3>
                    <p className="text-small text-ink-soft">
                      <span className="tabular-nums">{formatNumber(community.memberCount)}</span>{' '}
                      {pluralize(community.memberCount, 'fan')}
                    </p>
                  </div>
                  {community.description ? (
                    <p className="line-clamp-3 text-body text-ink">{community.description}</p>
                  ) : null}
                  <div className="mt-auto flex items-center pt-1">
                    <Link
                      href={
                        joined
                          ? routes.fan.community(handle, community.slug)
                          : withQuery(routes.fan.join(handle), {
                              community: community.slug,
                            })
                      }
                      className={cn(
                        buttonVariants({ variant: 'secondary', size: 'lg' }),
                        'h-11 w-full sm:w-auto',
                      )}
                    >
                      {joined ? <Check aria-hidden="true" className="size-4" /> : null}
                      {joined ? 'Open' : 'Join'}
                      <span className="sr-only"> {community.name}</span>
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
