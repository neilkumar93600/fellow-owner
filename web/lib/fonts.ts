import { Geist_Mono, Inter, Newsreader } from 'next/font/google';

/** Geist Mono: every UI string (nav, buttons, badges, labels, meta, short body). The page default. */
export const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

/** Inter with the optical-size axis: long reads only (post bodies, comments, legal, newsletters), via `font-sans`. */
export const inter = Inter({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-inter',
  display: 'swap',
});

/** Newsreader: headings and display type at weight 400, never bold (`font-display`). */
export const newsreader = Newsreader({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
});
