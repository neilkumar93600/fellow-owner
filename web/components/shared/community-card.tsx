import type { CommunityIcon, Tint } from '@fellow-owners/shared';
import { Check, ChevronRight, Pencil } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { formatNumber } from '@/lib/format';
import { routes } from '@/lib/routes';
import { AiChip } from './ai-chip';
import { COMMUNITY_ICON, cardTint, TINT_STYLES } from './tint';
import { Trend } from './trend';

/** The fields the card reads; StudioCommunity and PublicCommunity both fit. */
export interface CommunityCardData {
  name: string;
  slug: string;
  tint: Tint;
  icon: CommunityIcon;
  memberCount: number;
  /** Member growth against a week ago, in percent; null or absent hides the trend. */
  trendPct?: number | null;
  /** One-line digest; null until digests ship. */
  digest?: string | null;
}

export interface CommunityCardProps {
  community: CommunityCardData;
  /**
   * studio: Communities, the whole card links to the community and the pencil is its own button.
   * bio: the bio link, not a link; Join (or Joined) in place of the pencil.
   * select: a Join step tile, a checkbox.
   */
  variant: 'studio' | 'bio' | 'select';
  /** studio: the card's link; the community's dashboard page by default. */
  href?: string;
  /** studio: shows the ghost pencil. */
  onEdit?: () => void;
  /** bio */
  joined?: boolean;
  onJoin?: () => void;
  /** select */
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  /** select: the "AI suggested" chip and its reason, in the fan's own terms. */
  suggestion?: { reason: string };
  className?: string;
}

/**
 * DESIGN.md Community card: a frosted card washed in its aurora tint, radius 28 and padding 24; the 56px
 * icon tile with the name in H1 ink-soft beside it; 40px of open space; the 18px fans line ("Fans" 400,
 * the figure and the signed trend) and the digest in Body ink. Hover steps the name to ink (studio also fades in a
 * chevron); press is 0.98. On lavender the secondary words step up to ink-soft and a rising figure to ink;
 * the white card takes a Dove Grey tile with an ink icon.
 */
export function CommunityCard({
  community,
  variant,
  href,
  onEdit,
  joined = false,
  onJoin,
  selected = false,
  onSelectedChange,
  suggestion,
  className,
}: CommunityCardProps) {
  const { name, slug, icon, memberCount, trendPct, digest } = community;
  const tint = cardTint(community.tint);
  const styles = TINT_STYLES[tint];
  const lavender = tint === 'lavender';
  const surface = tint === 'white' ? 'white' : 'card';
  const Icon = COMMUNITY_ICON[icon];
  const nameId = `community-${slug}-name`;
  const reasonId = `community-${slug}-reason`;
  const base = cn(
    'relative flex flex-col gap-10 rounded-panel p-6 text-left text-ink shadow-[inset_1px_1px_0_rgb(255_255_255/0.7),var(--shadow-glass)] transition-[border-color] duration-200 hover:border-white',
    styles.card,
  );

  const tile = (
    <span className={cn('grid size-14 shrink-0 place-items-center rounded-2xl', styles.tile)}>
      <Icon aria-hidden="true" strokeWidth={1.5} className={cn('size-6', styles.icon)} />
    </span>
  );

  // Spans throughout, so the select tile stays valid inside its label.
  const data = (
    <span className="flex min-w-0 flex-1 flex-col gap-2">
      <span
        className={cn(
          'flex flex-wrap items-center gap-x-2 text-trend font-normal',
          lavender ? 'text-ink-soft' : 'text-ink-muted',
        )}
      >
        <span>Fans</span>
        <span className="font-medium text-ink-soft">{formatNumber(memberCount)}</span>
        {trendPct == null ? null : (
          <>
            <Trend changePct={trendPct} surface={lavender ? 'lavender' : 'default'} />
            <span>this week</span>
          </>
        )}
      </span>
      {digest ? <span className="max-w-[68ch] text-body text-ink">{digest}</span> : null}
    </span>
  );

  if (variant === 'select') {
    // A native checkbox carries the role and state; the label is the tile and wears its focus ring.
    return (
      <label
        className={cn(
          base,
          'group press cursor-pointer border-2 p-[22px] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink',
          selected ? 'border-ink' : 'border-transparent',
          className,
        )}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={selected}
          onChange={(event) => onSelectedChange?.(event.target.checked)}
          aria-labelledby={nameId}
          aria-describedby={suggestion ? reasonId : undefined}
        />
        <span className="flex items-center gap-4 pr-8">
          {tile}
          <span className="flex min-w-0 flex-col gap-1.5">
            <span
              id={nameId}
              className="text-h1 text-ink-soft transition-colors duration-150 ease-out-quart group-hover:text-ink"
            >
              {name}
            </span>
            {suggestion ? (
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <AiChip kind="suggested" />
                <span id={reasonId} className="text-small text-ink-soft">
                  {suggestion.reason}
                </span>
              </span>
            ) : null}
          </span>
        </span>
        {data}
        {selected ? (
          <span className="absolute top-4 right-4 grid size-6 place-items-center rounded-full bg-ink text-white">
            <Check aria-hidden="true" strokeWidth={2} className="size-4" />
          </span>
        ) : null}
      </label>
    );
  }

  const studio = variant === 'studio';
  return (
    <article
      className={cn(
        base,
        'group p-6',
        studio &&
          'transition-[scale] duration-150 ease-out-quart motion-safe:has-[[data-card-link]:active]:scale-[0.98]',
        className,
      )}
    >
      <div className={cn('flex items-center gap-4', studio && 'pr-6')}>
        {tile}
        <h3
          className={cn(
            'text-h1 text-ink-soft',
            studio && 'transition-colors duration-150 ease-out-quart group-hover:text-ink',
          )}
        >
          {studio ? (
            <Link
              data-card-link=""
              href={href ?? routes.dashboard.community(slug)}
              className="outline-none after:absolute after:inset-0 after:rounded-panel focus-visible:text-ink focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ink"
            >
              {name}
            </Link>
          ) : (
            name
          )}
        </h3>
      </div>
      {studio ? (
        <ChevronRight
          aria-hidden="true"
          strokeWidth={1.5}
          className="pointer-events-none absolute top-6 right-6 size-4 text-ink opacity-0 transition-opacity duration-150 ease-out-quart group-hover:opacity-100 group-has-[[data-card-link]:focus-visible]:opacity-100"
        />
      ) : null}
      <div className="flex items-end gap-4">
        {data}
        {studio && onEdit ? (
          <Button
            variant="ghost"
            surface={surface}
            aria-label={`Edit ${name}`}
            onClick={onEdit}
            className="relative z-10 -mr-2 -mb-2"
          >
            <Pencil />
          </Button>
        ) : null}
        {variant === 'bio' ? (
          joined ? (
            <span className="inline-flex h-12 shrink-0 items-center gap-2 text-label text-ink">
              <Check aria-hidden="true" strokeWidth={1.5} className="size-5" />
              Joined
            </span>
          ) : (
            <Button variant="secondary" surface={surface} onClick={onJoin}>
              Join<span className="sr-only"> {name}</span>
            </Button>
          )
        ) : null}
      </div>
    </article>
  );
}
