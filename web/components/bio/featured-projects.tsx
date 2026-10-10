import type { CommunityIcon, FeaturedProject } from '@fellow-owners/shared';
import Link from 'next/link';
import { CommunityChip } from '@/components/shared/community-chip';
import { formatDate, formatNumber, pluralize } from '@/lib/format';
import { routes } from '@/lib/routes';
import { CommunityCover } from './community-cover';

export interface FeaturedProjectsProps {
  handle: string;
  firstName: string;
  featured: FeaturedProject[];
  /** The space's communities: a featured row carries only the room's name and tint, so the cover and icon come from here. */
  communities: { name: string; slug: string; icon: CommunityIcon }[];
}

/**
 * "Made by Mira's fans": the things fans made and the creator featured. Each is a frosted card with the
 * room's cover on top, the title as the card's one link, a two-line summary and who made it. Hover
 * underlines the title; press is 0.98.
 */
export function FeaturedProjects({
  handle,
  firstName,
  featured,
  communities,
}: FeaturedProjectsProps) {
  if (featured.length === 0) return null;
  return (
    <section aria-labelledby="bio-featured" className="flex flex-col gap-4">
      <h2 id="bio-featured" className="font-display text-[2rem] leading-[1.15] text-ink">
        Made by {firstName}’s fans
      </h2>
      <ul className="grid gap-4 @xl:grid-cols-2">
        {featured.map((project) => {
          const room = communities.find((c) => c.name === project.communityName);
          return (
            <li key={project.showcaseSlug} className="flex min-w-0">
              <article className="group glass relative flex w-full press flex-col overflow-hidden hover:bg-white/80">
                <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden">
                  <CommunityCover
                    slug={room?.slug ?? ''}
                    name={project.communityName}
                    tint={project.tint}
                    icon={room?.icon ?? 'users'}
                    sizes="(min-width: 576px) 380px, 100vw"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <CommunityChip
                    name={project.communityName}
                    tint={project.tint}
                    icon={room?.icon ?? 'users'}
                    className="self-start"
                  />
                  <h3 className="text-h2 text-ink">
                    <Link
                      href={routes.fan.showcase(handle, project.showcaseSlug)}
                      className="outline-none group-hover:underline after:absolute after:inset-0 after:rounded-panel focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ink"
                    >
                      {project.title}
                    </Link>
                  </h3>
                  <p className="line-clamp-2 text-body text-ink">{project.excerpt}</p>
                  <p className="mt-auto text-small text-ink-soft">
                    {formatNumber(project.teamSize)}{' '}
                    {pluralize(project.teamSize, 'person', 'people')} made it · Featured{' '}
                    {formatDate(project.publishedAt)}
                  </p>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
