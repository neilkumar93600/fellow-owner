import { createCn } from 'cn/config';

/**
 * Tailwind class merger. The project's type tokens (globals.css @theme: text-display, text-small,
 * text-hero, ...) are registered as font sizes, so cn('text-small text-ink') keeps both classes
 * instead of treating the size as a colour.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display',
            'h1',
            'h2',
            'stat',
            'body',
            'small',
            'caption',
            'hero',
            'section',
            'lead',
          ],
        },
      ],
    },
  },
});
