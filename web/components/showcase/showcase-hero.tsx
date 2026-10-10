import type { Showcase } from '@fellow-owners/shared';
import { POST_STATUS_LABELS } from '@fellow-owners/shared';
import Link from 'next/link';
import { CommunityCover } from '@/components/bio/community-cover';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { CommunityChip } from '@/components/shared/community-chip';
import { CopyButton } from '@/components/shared/copy-button';
import { StatusPill } from '@/components/shared/status-pill';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

export interface ShowcaseHeroProps {
  space: Showcase['space'];
  promotion: Showcase['promotion'];
  post: NonNullable<Showcase['post']>;
  /** The absolute showcase URL that Copy link copies. */
  shareUrl: string;
}

/**
 * The top of a showcase: the room's cover photo, then a frosted panel that overlaps it with "Featured by
 * Mira" (back to the bio), the title in Instrument Serif, the creator's headline, the room chip, "Made
 * it" status and date, and the screen's one coral "Join Mira's space" beside a glass Copy link pill.
 */
export function ShowcaseHero({ space, promotion, post, shareUrl }: ShowcaseHeroProps) {
  const first = space.displayName.split(' ')[0];
  // The composer's default headline only repeats the title ("Featured: {title}"), so it shows only when
  // the creator wrote her own.
  const lead =
    promotion.headline && promotion.headline.replace(/^Featured:\s*/i, '') !== post.title
      ? promotion.headline
      : null;

  return (
    <header className="flex flex-col">
      <div className="glass relative h-40 overflow-hidden sm:h-60">
        <CommunityCover
          slug={post.community.slug}
          name={post.community.name}
          tint={post.community.tint}
          icon={post.community.icon}
          sizes="(min-width: 840px) 792px, 100vw"
        />
      </div>
      <div className="glass-strong relative z-10 -mt-10 flex flex-col items-start gap-4 p-5 sm:mx-6 sm:p-7">
        <Link
          href={routes.fan.space(space.handle)}
          className="-ml-1 inline-flex h-11 press items-center gap-3 rounded-full pr-4 pl-1 text-label text-ink hover:bg-white/60"
        >
          <AvatarInitials name={space.displayName} image={space.avatarUrl} size={40} />
          Featured by {first}
        </Link>
        <h1 className="font-display text-[2.25rem] leading-[1.1] font-normal text-ink sm:text-[2.75rem]">
          {post.title}
        </h1>
        {lead ? <p className="max-w-[68ch] text-body text-ink">{lead}</p> : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <CommunityChip
            name={post.community.name}
            tint={post.community.tint}
            icon={post.community.icon}
          />
          <StatusPill status={post.status} label={POST_STATUS_LABELS[post.status]} />
          {promotion.publishedAt ? (
            <span className="text-small text-ink">
              Featured {formatDate(promotion.publishedAt)}
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href={routes.fan.join(space.handle)}
            className={cn(buttonVariants(), 'w-full sm:w-auto')}
          >
            Join {first}’s space
          </Link>
          <CopyButton
            variant="secondary"
            surface="glass"
            label="Copy link"
            message="Link copied"
            value={shareUrl}
            className="w-full sm:w-auto"
          />
        </div>
      </div>
    </header>
  );
}
