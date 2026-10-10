import type { CommunityIcon, Tint } from '@fellow-owners/shared';
import { CreatorImage } from '@/components/shared/creator-image';
import { COMMUNITY_ICON, cardTint, TINT_STYLES } from '@/components/shared/tint';
import { cn } from '@/components/ui/cn';
import { CREATOR_ASSETS, type CreatorAsset } from '@/lib/creator-assets';

/** The generated cover for a community slug, or null when it has none (a creator's own rooms). */
export function coverFor(slug: string): CreatorAsset | null {
  const name = `cover-${slug}`;
  return name in CREATOR_ASSETS ? (name as CreatorAsset) : null;
}

export interface CommunityCoverProps {
  slug: string;
  name: string;
  tint: Tint;
  icon: CommunityIcon;
  sizes: string;
  className?: string;
}

/**
 * A community's photo cover, filling its positioned parent. With no photo for the slug it is the room's
 * tint with its icon, so a creator's own communities still get a cover.
 */
export function CommunityCover({ slug, name, tint, icon, sizes, className }: CommunityCoverProps) {
  const cover = coverFor(slug);
  if (cover) {
    return (
      <CreatorImage fill name={cover} alt={`${name} cover`} sizes={sizes} className={className} />
    );
  }
  const styles = TINT_STYLES[cardTint(tint)];
  const Icon = COMMUNITY_ICON[icon];
  return (
    <div
      role="img"
      aria-label={`${name} cover`}
      className={cn('absolute inset-0 grid place-items-center', styles.tile, className)}
    >
      <Icon aria-hidden="true" strokeWidth={1.25} className={cn('size-12', styles.icon)} />
    </div>
  );
}
