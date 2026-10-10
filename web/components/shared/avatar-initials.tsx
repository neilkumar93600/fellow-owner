'use client';

import { useState } from 'react';
import { cn } from '@/components/ui/cn';

type AvatarSize = 28 | 40 | 48 | 96;

const TILES = ['bg-peach-tile', 'bg-lavender-tile', 'bg-aqua-tile'] as const;

const SIZE: Record<AvatarSize, string> = {
  28: 'size-7 text-small-strong',
  40: 'size-10 text-small-strong',
  48: 'size-12 text-label',
  96: 'size-24 text-h1',
};
// Stacked 28px avatars (the ring) set their initials in Caption.
const STACKED = 'size-7 text-caption';

/** "Arjun Rao" is "AR", "Mira" is "MI". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

/** The same name always lands on the same tile tint. Lime is never an avatar tint. */
function tileFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return TILES[Math.abs(hash) % TILES.length];
}

export interface AvatarInitialsProps {
  name: string;
  /** A photo (Mira's licensed stock photo); everyone else gets initials. */
  image?: string | null;
  size?: AvatarSize;
  /** The 2px Pure White ring of stacked avatars. */
  ring?: boolean;
  /** The 10px Meadow Green online dot, ringed 2px in Pure White. */
  online?: boolean;
  className?: string;
}

/**
 * DESIGN.md Avatar: initials on a tile tint hashed from the name (Small Strong at 28 and 40, H1 at 96),
 * or the photo at the same size; a photo that fails to load falls back to the initials. Decorative: the
 * name always sits beside it in text or in the control's aria-label, so it is hidden from screen readers.
 */
export function AvatarInitials({
  name,
  image,
  size = 40,
  ring = false,
  online = false,
  className,
}: AvatarInitialsProps) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span aria-hidden="true" className={cn('relative inline-flex shrink-0', className)}>
      {image && failed !== image ? (
        // ponytail: plain img, avatars can be any origin and are tiny; next/image needs remotePatterns.
        // biome-ignore lint/performance/noImgElement: see above
        <img
          src={image}
          alt=""
          width={size}
          height={size}
          onError={() => setFailed(image)}
          // An image that failed before hydration never fires onError.
          ref={(img) => {
            if (img?.complete && img.naturalWidth === 0) setFailed(image);
          }}
          className={cn(SIZE[size], 'rounded-full object-cover', ring && 'ring-2 ring-white')}
        />
      ) : (
        <span
          className={cn(
            ring && size === 28 ? STACKED : SIZE[size],
            tileFor(name),
            'grid place-items-center rounded-full text-ink select-none',
            ring && 'ring-2 ring-white',
          )}
        >
          {initials(name)}
        </span>
      )}
      {online ? (
        <span className="absolute top-0 right-0 size-2.5 rounded-full bg-success ring-2 ring-white" />
      ) : null}
    </span>
  );
}

export interface AvatarStackProps {
  people: { name: string; image?: string | null }[];
  /** How many faces to show before the "+N" chip. */
  max?: number;
  /** The full head count when `people` is a preview (PostCard.teamSize). */
  total?: number;
  className?: string;
}

/**
 * Overlapping 28px avatars (Caption initials, 2px Pure White rings, -8px overlap), then a "+N" chip when
 * there are more people than faces. One image to assistive tech, named by the people in it.
 */
export function AvatarStack({ people, max = 4, total, className }: AvatarStackProps) {
  const shown = people.slice(0, max);
  const count = Math.max(total ?? people.length, shown.length);
  const more = count - shown.length;
  const names = shown.map((person) => person.name).join(', ');
  const label = more > 0 ? `${names} and ${more} more` : names;

  return (
    <span role="img" aria-label={label} className={cn('flex items-center -space-x-2', className)}>
      {shown.map((person) => (
        <AvatarInitials key={person.name} name={person.name} image={person.image} size={28} ring />
      ))}
      {more > 0 ? (
        <span
          aria-hidden="true"
          className="grid size-7 place-items-center rounded-full bg-table-head text-caption text-ink ring-2 ring-white"
        >
          +{more}
        </span>
      ) : null}
    </span>
  );
}
