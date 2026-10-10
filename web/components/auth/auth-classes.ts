// Plain class strings, kept out of the client modules so server components can import them too.

/** Solid 2px ink ring (DESIGN.md Focus Ring correction: 40% alpha fails 3:1). */
export const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

/** Inline text link in ink, underlined. */
export const TEXT_LINK = [
  'rounded-sm font-medium text-ink underline decoration-line-row decoration-1 underline-offset-4',
  'transition-[text-decoration-color] duration-150 ease-[var(--ease-out-quart)] hover:decoration-ink',
  FOCUS_RING,
].join(' ');

/** The form column of SplitFrame: centred in its half, header to footer. */
export const SPLIT_COLUMN = 'mx-auto flex w-full min-w-0 flex-col';

/**
 * The right column of SplitFrame from 1024px: it sticks at the page padding (24px)
 * and is as tall as the window inside it, so a long form scrolls past it.
 */
export const SPLIT_ASIDE = 'min-w-0 lg:sticky lg:top-6 lg:h-[calc(100svh-3rem)] lg:self-start';

/**
 * Joins class names without merging. The project's `cn` runs tailwind-merge, which reads custom size
 * tokens such as `text-small` or `text-display` as colors and drops them next to `text-ink`.
 */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * For a text link: a 44px tall hit area centred on the link, without moving anything. Fixed rather than
 * an inset, so it stays 44px whatever the line height.
 */
export const LINK_HIT_AREA =
  'relative after:absolute after:-inset-x-2 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-[""]';

/**
 * For a link in a field's label row (Forgot password? beside the Password label): the hit area grows up
 * into the free gap above the row and stops short of the input below it.
 */
export const LABEL_LINK_HIT_AREA =
  'relative after:absolute after:-inset-x-2 after:-top-5 after:-bottom-1.5 after:content-[""]';

/** Two fields to a line once the form (an @container) is 24rem wide; one column on phones. */
export const FIELD_PAIR =
  'grid grid-cols-1 items-start gap-x-3 gap-y-4 short:gap-y-3 @min-[24rem]:grid-cols-2';
