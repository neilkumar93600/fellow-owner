import type { SpacePage } from '@fellow-owners/shared';
import { routes } from '@/lib/routes';
import { CommunityGrid } from './community-grid';
import { CreatorHeader } from './creator-header';
import { FansOfTheWeek } from './fans-of-the-week';
import { FeaturedProjects } from './featured-projects';
import { PitchCta } from './pitch-cta';
import { VisitBeacon } from './visit-beacon';

export interface BioViewProps {
  page: SpacePage;
  /** The viewer's communities in this space (ViewerMembership.membership.communityIds); none for visitors. */
  joinedIds?: readonly string[];
  /** The creator looking at their own bio link: the way in opens the studio and the idea panel goes. */
  isOwner?: boolean;
}

/**
 * The bio link (/{handle}), DESIGN.md Bio link recipe: cover and frosted profile card, the photo-cover
 * rooms to join, the coral "Send Mira an idea", "Fans of the week", then "Made by Mira's fans". Never
 * one-way: the rooms and Join always show. No match labels, no verification claims.
 */
export function BioView({ page, joinedIds = [], isOwner = false }: BioViewProps) {
  const { space, communities, featured, spotlights } = page;
  const first = space.displayName.split(' ')[0];
  // A fan's way in goes straight to their first room instead of back into Join (03-app-flow §4).
  const home = communities.find((c) => joinedIds.includes(c.id));
  const cta = isOwner
    ? { href: routes.dashboard.today(), label: 'Open your studio' }
    : home
      ? {
          href: routes.fan.community(space.handle, home.slug),
          label: `Go to ${home.name}`,
        }
      : { href: routes.fan.join(space.handle), label: `Join ${first}’s space` };

  return (
    <div className="flex flex-col gap-10">
      {isOwner ? null : <VisitBeacon handle={space.handle} />}
      <CreatorHeader space={space} cta={cta} />
      <CommunityGrid handle={space.handle} communities={communities} joinedIds={joinedIds} />
      {isOwner ? null : <PitchCta handle={space.handle} firstName={first} />}
      <FansOfTheWeek firstName={first} spotlights={spotlights} />
      <FeaturedProjects
        handle={space.handle}
        firstName={first}
        featured={featured}
        communities={communities}
      />
    </div>
  );
}
