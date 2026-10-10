import Image from 'next/image';
import { cn } from '@/components/ui/cn';
import { CREATOR_ASSETS, type CreatorAsset, type CreatorTone } from '@/lib/creator-assets';
import { imageMode } from './creator-image-core.mjs';

/** Golden-hour gradients that stand in for an image not generated yet: soft light from the top left. */
const PLACEHOLDER: Record<CreatorTone, string> = {
  peach:
    'radial-gradient(120% 90% at 20% 10%, #fff3ea 0%, transparent 55%), linear-gradient(150deg, #ffd9c2 0%, #f6b99c 55%, #e9a3a0 100%)',
  sky: 'radial-gradient(120% 90% at 20% 10%, #f2f8ff 0%, transparent 55%), linear-gradient(150deg, #bfddf7 0%, #9fc5ea 55%, #b8b4e8 100%)',
  lilac:
    'radial-gradient(120% 90% at 20% 10%, #f7f2ff 0%, transparent 55%), linear-gradient(150deg, #dccff7 0%, #c4b2ee 55%, #f0bfb4 100%)',
  mint: 'radial-gradient(120% 90% at 20% 10%, #f1fbf6 0%, transparent 55%), linear-gradient(150deg, #cfefe3 0%, #a9dcc8 55%, #bfddf7 100%)',
};

export interface CreatorImageProps {
  name: CreatorAsset;
  alt: string;
  /** Above the fold (the hero portrait): preloads the image. */
  priority?: boolean;
  sizes?: string;
  className?: string;
  /** Fill a positioned parent instead of keeping the asset's own ratio. */
  fill?: boolean;
}

/**
 * DESIGN.md Creator image: next/image once the asset is generated (CREATOR_ASSETS[name].ready), else a
 * same-ratio golden-hour gradient with role="img" and the alt text. Never a broken image, never a shift.
 */
export function CreatorImage({ name, alt, priority, sizes, className, fill }: CreatorImageProps) {
  const asset = CREATOR_ASSETS[name];

  if (imageMode(asset) === 'placeholder') {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(fill ? 'absolute inset-0' : 'w-full', className)}
        style={{
          backgroundImage: PLACEHOLDER[asset?.tone ?? 'peach'],
          aspectRatio: fill || !asset ? undefined : `${asset.width} / ${asset.height}`,
        }}
      />
    );
  }

  return fill ? (
    <Image
      src={asset.src}
      alt={alt}
      fill
      preload={priority}
      sizes={sizes ?? '100vw'}
      className={cn('object-cover', className)}
    />
  ) : (
    <Image
      src={asset.src}
      alt={alt}
      width={asset.width}
      height={asset.height}
      preload={priority}
      sizes={sizes}
      className={cn('h-auto w-full', className)}
    />
  );
}
