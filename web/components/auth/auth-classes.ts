// Plain class strings, kept out of the client modules so server components can import them too.

/** Solid 2px purple ring (DESIGN.md Focus Ring correction: 40% alpha fails 3:1). */
export const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple';

/** Inline text link in ink, underlined. */
export const TEXT_LINK = [
  'rounded-sm font-medium text-ink underline decoration-line-row decoration-1 underline-offset-4',
  'transition-[text-decoration-color] duration-150 ease-[var(--ease-out-quart)] hover:decoration-ink',
  FOCUS_RING,
].join(' ');

/**
 * Joins class names without merging. The project's `cn` runs tailwind-merge, which reads custom size
 * tokens such as `text-small` or `text-display` as colors and drops them next to `text-ink`.
 */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** For a text link that stands on its own line: a 44px tall hit area without moving anything. */
export const LINK_HIT_AREA =
  'relative after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[""]';
