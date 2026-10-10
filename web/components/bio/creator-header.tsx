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

// ponytail: only the demo creator has generated photos; every other creator gets the aurora gradient and
// their avatar until creators can upload a cover and portrait.
const DEMO_PHOTOS: { cover: CreatorAsset; portrait: CreatorAsset } = {
  cover: 'vlog-van-coast',
  portrait: 'mira-portrait',
};

export interface CreatorHeaderProps {
  /** space.isDemo marks the demo world: it gets the generated cover and portrait. */
  space: PublicSpace;
  /** The viewer's way in: Join for visitors, the first joined community for members, the studio for the owner. */
  cta: { href: string; label: string };
}

/**
 * DESIGN.md Bio link: a cover photo, then a frosted profile card that overlaps it: the round portrait, the
 * name in Instrument Serif, @handle and the bio, the platform follower chips as 44px glass pills that
 * link out, the follower and fan totals and the way in (a glass pill: the page's coral is "Send an
 * idea"). Words sit on glass-strong, so they are ink.
 */
export function CreatorHeader({ space, cta }: CreatorHeaderProps) {
  const first = space.displayName.split(' ')[0];
  const photos = space.isDemo ? DEMO_PHOTOS : undefined;
  return (
    <header className="flex flex-col">
      <div className="glass relative h-52 overflow-hidden sm:h-64">
        {space.coverUrl ? (
          // biome-ignore lint/performance/noImgElement: uploads come from the bucket, not next/image remotePatterns
          <img
            src={space.coverUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
            fetchPriority="high"
          />
        ) : photos ? (
          <CreatorImage
            fill
            priority
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
        <div className="-mt-12 rounded-full bg-white p-1 shadow-glass">
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
          <h1 className="font-display text-[2.25rem] leading-[1.1] font-normal text-ink sm:text-[2.75rem]">
            {space.displayName}
          </h1>
          <p className="text-body text-ink">@{space.handle}</p>
        </div>
        {space.bio ? <p className="max-w-[46ch] text-body text-ink">{space.bio}</p> : null}

        {space.platforms.length > 0 ? (
          <ul
            aria-label={`${first} on other platforms`}
            className="flex flex-wrap justify-center gap-2"
          >
            {space.platforms.map((entry) => (
              <li key={entry.url}>
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-chip inline-flex h-11 press items-center gap-2 px-4 text-label text-ink hover:bg-white/90"
                >
                  {entry.platform === 'other' ? (
                    <Globe aria-hidden="true" strokeWidth={1.5} className="size-5 shrink-0" />
                  ) : (
                    <PlatformIcon platform={entry.platform} />
                  )}
                  <span className="tabular-nums">{formatCompact(entry.followers)}</span>
                  <span className="text-ink-soft">{PLATFORM_LABELS[entry.platform]}</span>
                  <span className="sr-only"> followers (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="text-body text-ink">
          <span className="tabular-nums">{formatCompact(space.totalFollowers)}</span> followers ·{' '}
          <span className="tabular-nums">{formatNumber(space.memberCount)}</span>{' '}
          {pluralize(space.memberCount, 'fan')} in the space
        </p>

        <Link
          href={cta.href}
          className={cn(buttonVariants({ variant: 'secondary' }), 'w-full sm:w-auto sm:min-w-64')}
        >
          {cta.label}
        </Link>
      </div>
    </header>
  );
}
