import { PLATFORM_LABELS, type PublicSpace } from '@fellow-owners/shared';
import { Globe } from 'lucide-react';
import Link from 'next/link';
import { PlatformIcon } from '@/components/auth/platform-icons';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { CreatorImage } from '@/components/shared/creator-image';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import type { CreatorAsset } from '@/lib/creator-assets';
import { formatCompact, formatNumber, pluralize } from '@/lib/format';

const PLATFORM_CHIP =
  'glass-chip inline-flex h-11 items-center gap-2 px-4 text-small text-ink uppercase';

export interface CreatorHeaderProps {
  space: PublicSpace;
  /** Generated cover and portrait for the landing's example creator; real creators get the gradient and their avatar. */
  photos?: { cover: CreatorAsset; portrait: CreatorAsset };
  /** The viewer's way in: Join for visitors, the first joined community for members, the studio for the owner. */
  cta: { href: string; label: string };
  /** The bio page's one h1; a preview inside another page (the landing mockups) passes 'p'. */
  nameAs?: 'h1' | 'p';
  /** The cover is the bio page's LCP image; a below-the-fold preview passes false so it doesn't compete. */
  priority?: boolean;
  /** False draws the same pills as plain text with no links or tab stops (the landing's decorative mockups). */
  interactive?: boolean;
}

/**
 * DESIGN.md Bio link: a cover photo, then a frosted profile card that overlaps it: the round portrait, the
 * name in Newsreader serif, @handle and the bio (Inter, a long read), the platform follower chips as 44px glass pills that
 * link out, the follower and fan totals and the way in (a glass pill: the page's blue is "Send an
 * idea"). Words sit on glass-strong, so they are ink.
 */
export function CreatorHeader({
  space,
  photos,
  cta,
  nameAs: Name = 'h1',
  priority = true,
  interactive = true,
}: CreatorHeaderProps) {
  const first = space.displayName.split(' ')[0];
  const ctaClass = cn(buttonVariants({ variant: 'secondary' }), 'w-full sm:w-auto sm:min-w-64');
  return (
    <header className="flex flex-col">
      <div className="glass relative h-52 overflow-hidden sm:h-64">
        {space.coverUrl ? (
          // biome-ignore lint/performance/noImgElement: uploads come from the bucket, not next/image remotePatterns
          <img
            src={space.coverUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
            fetchPriority={priority ? 'high' : 'auto'}
          />
        ) : photos ? (
          <CreatorImage
            fill
            priority={priority}
            name={photos.cover}
            alt={`${first} on the road`}
            sizes="(min-width: 840px) 792px, 100vw"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(135deg,#ffd9c2,#dccff7_55%,#bfddf7)]"
          />
        )}
      </div>

      <div className="glass-strong relative z-10 -mt-12 flex flex-col items-center gap-4 px-5 pt-0 pb-6 text-center sm:mx-6 sm:px-8">
        <div className="-mt-12 rounded-full border border-line bg-white p-1">
          {photos ? (
            <span
              aria-hidden="true"
              className="relative block size-24 overflow-hidden rounded-full sm:size-28"
            >
              <CreatorImage
                fill
                name={photos.portrait}
                alt=""
                sizes="112px"
                className="object-top"
              />
            </span>
          ) : (
            <AvatarInitials name={space.displayName} image={space.avatarUrl} size={96} />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Name className="font-display text-[2.25rem] leading-[1.1] font-normal text-ink sm:text-[2.75rem]">
            {space.displayName}
          </Name>
          <p className="text-small text-ink-soft">@{space.handle}</p>
        </div>
        {space.bio ? (
          <p className="max-w-[46ch] font-sans text-body text-ink">{space.bio}</p>
        ) : null}

        {space.platforms.length > 0 ? (
          <ul
            aria-label={`${first} on other platforms`}
            className="flex flex-wrap justify-center gap-2"
          >
            {space.platforms.map((entry) => {
              const chip = (
                <>
                  {entry.platform === 'other' ? (
                    <Globe aria-hidden="true" strokeWidth={1.5} className="size-5 shrink-0" />
                  ) : (
                    <PlatformIcon platform={entry.platform} />
                  )}
                  <span className="font-medium tabular-nums">{formatCompact(entry.followers)}</span>
                  <span className="text-ink-soft">{PLATFORM_LABELS[entry.platform]}</span>
                </>
              );
              return (
                <li key={entry.url}>
                  {interactive ? (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(PLATFORM_CHIP, 'press hover:bg-white/90')}
                    >
                      {chip}
                      <span className="sr-only"> followers (opens in a new tab)</span>
                    </a>
                  ) : (
                    <span className={PLATFORM_CHIP}>{chip}</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}

        <p className="text-caption uppercase text-ink-soft">
          <span className="tabular-nums">{formatCompact(space.totalFollowers)}</span> followers ·{' '}
          <span className="tabular-nums">{formatNumber(space.memberCount)}</span>{' '}
          {pluralize(space.memberCount, 'fan')} in the space
        </p>

        {interactive ? (
          <Link href={cta.href} className={ctaClass}>
            {cta.label}
          </Link>
        ) : (
          <span className={ctaClass}>{cta.label}</span>
        )}
      </div>
    </header>
  );
}
