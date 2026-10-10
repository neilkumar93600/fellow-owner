import { createCn } from 'cn/config';

/**
 * Class merging that knows this project's Tailwind tokens. The stock `cn` reads custom roles such as
 * `text-small` or `text-label` as colors and drops them next to `text-ink`; here they merge as font
 * sizes, `rounded-card` as a radius and `shadow-overlay` as a shadow, so a caller's className overrides
 * a primitive's class of the same kind and nothing else.
 */
export const cn = createCn({
  extend: {
    theme: {
      text: [
        'display',
        'h1',
        'h2',
        'stat',
        'count',
        'trend',
        'body',
        'label',
        'label-strong',
        'small',
        'small-strong',
        'caption',
        'hero',
        'section',
        'lead',
      ],
      radius: ['card', 'shell', 'panel', 'chip'],
      shadow: ['overlay', 'glass'],
      ease: ['out-quart', 'out-quint', 'out-expo'],
    },
  },
});
