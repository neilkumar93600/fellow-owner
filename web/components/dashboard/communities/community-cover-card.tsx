import type { StudioCommunity } from '@fellow-owners/shared';
import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { CreatorImage } from '@/components/shared/creator-image';
import { COMMUNITY_ICON, cardTint, TINT_STYLES } from '@/components/shared/tint';
import { Trend } from '@/components/shared/trend';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { CREATOR_ASSETS, type CreatorAsset } from '@/lib/creator-assets';
import { formatNumber } from '@/lib/format';
import { routes } from '@/lib/routes';

export interface CommunityCoverCardProps {
  community: StudioCommunity;
  /** The one-line digest under the figures. */
  digest: string;
  onEdit: () => void;
  className?: string;
}

/** The slug's photo cover when one was generated for it (cover-<slug>), else null. */
function coverFor(slug: string): CreatorAsset | null {
  const key = `cover-${slug}`;
  return key in CREATOR_ASSETS ? (key as CreatorAsset) : null;
}

/**
 * A community on the Communities screen: a photo cover (a tint with its icon when the slug has none),
 * the name as the card's link, fans with the week's trend, the digest and a ghost Edit.
 */
export function CommunityCoverCard({
  community,
  digest,
  onEdit,
  className,
}: CommunityCoverCardProps) {
  const cover = coverFor(community.slug);
  const styles = TINT_STYLES[cardTint(community.tint)];
  const Icon = COMMUNITY_ICON[community.icon];
  return (
    <article
      className={cn(
        'glass group relative flex min-w-0 flex-col overflow-hidden rounded-panel transition-[scale] duration-150 ease-out-quart motion-safe:has-[[data-card-link]:active]:scale-[0.99]',
        className,
      )}
    >
      <div className={cn('relative h-36 overflow-hidden', !cover && styles.tile)}>
        {cover ? (
          <CreatorImage
            name={cover}
            alt=""
            fill
            sizes="(min-width: 1024px) 40vw, 90vw"
            className="transition-transform duration-300 ease-out-quart group-hover:scale-[1.03]"
          />
        ) : (
          <Icon
            aria-hidden="true"
            strokeWidth={1.5}
            className={cn('absolute top-1/2 left-6 size-10 -translate-y-1/2', styles.icon)}
          />
        )}
      </div>
      <div className="flex flex-col gap-3 p-6">
        <h3 className="text-h1 text-ink">
          <Link
            data-card-link=""
            href={routes.dashboard.community(community.slug)}
            className="outline-none after:absolute after:inset-0 after:rounded-panel focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ink"
          >
            {community.name}
          </Link>
        </h3>
        <p className="flex flex-wrap items-center gap-x-2 text-trend font-normal text-ink-soft">
          <span>Fans</span>
          <span className="font-medium text-ink">{formatNumber(community.memberCount)}</span>
          {community.trendPct == null ? null : (
            <>
              <Trend changePct={community.trendPct} />
              <span>this week</span>
            </>
          )}
        </p>
        <div className="flex items-end gap-3">
          <p className="min-w-0 flex-1 text-body text-ink">{digest}</p>
          <Button
            variant="ghost"
            surface="glass"
            aria-label={`Edit ${community.name}`}
            onClick={onEdit}
            className="relative z-10 -mr-2 -mb-2 shrink-0"
          >
            <Pencil />
          </Button>
        </div>
      </div>
    </article>
  );
}
