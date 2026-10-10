import { clsx } from 'cn';
import { getImageProps } from 'next/image';

/** A 1x1 transparent GIF: what the picture shows (and fetches) below the breakpoint, where it is hidden. */
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * A full-bleed picture that only screens from 1024px download (Next's getImageProps art direction): the
 * optimized srcset sits on a <source> that matches from 1024px, where the auth image column and the
 * onboarding preview art show. Phones, often inside an in-app browser, match nothing and keep the inline
 * blank, so they never fetch it (loading="lazy" did not stop a display: none image from loading). It
 * fills its positioned parent (`fill`), object-cover, cropped around `focus` (a CSS object-position).
 */
export function DesktopPicture({
  src,
  alt,
  focus,
  sizes,
  className,
}: {
  src: string;
  alt: string;
  focus?: string;
  sizes: string;
  className?: string;
}) {
  const {
    props: { srcSet, sizes: imageSizes, src: _src, ...img },
  } = getImageProps({ src, alt, fill: true, sizes, loading: 'eager' });
  return (
    <picture>
      <source media="(min-width: 1024px)" srcSet={srcSet} sizes={imageSizes} />
      <img
        {...img}
        src={BLANK}
        alt={alt}
        className={clsx('object-cover', className)}
        style={{ ...img.style, objectPosition: focus }}
      />
    </picture>
  );
}
