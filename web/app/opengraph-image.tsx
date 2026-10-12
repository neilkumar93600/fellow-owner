import { spaceOgImage } from '@/components/bio/og-image';
import { SITE } from '@/lib/constants';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';

export const alt = DEFAULT_OG_IMAGE.alt;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// The site's share card, the same frame as the bio link and showcase cards (components/bio/og-image).
// Pages name it in their openGraph through lib/seo pageMetadata.
export default function Image() {
  return spaceOgImage({
    eyebrow: 'One link in your bio',
    title: SITE.tagline,
    line: 'Communities for your followers, the best ideas sorted, and a spotlight for your fans.',
    chips: [
      { name: 'Communities', tint: 'peach' },
      { name: 'Ideas', tint: 'lavender' },
      { name: 'Spotlight', tint: 'white' },
    ],
  });
}
