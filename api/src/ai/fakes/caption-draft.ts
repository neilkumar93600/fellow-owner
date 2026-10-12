import { LIMITS, PLANNER_LIMITS } from '@fellow-owners/shared';
import { trimLine, trimText } from '../guard.js';
import type { CaptionDraftAiInput, CaptionDraftAiOutput } from '../tasks/caption-draft.js';

/**
 * Deterministic caption draft for tests and keyless dev: the title, then the first sentence of the
 * notes, then the link; hashtags are the title's first three words of 4+ letters. Fits X's 280.
 */
export function fakeCaptionDraft(input: CaptionDraftAiInput): CaptionDraftAiOutput {
  const note = input.notes
    ?.replace(/\s+/g, ' ')
    .trim()
    .match(/^(.+?[.!?])(\s|$)/)?.[1];
  const max = input.platform === 'x' ? LIMITS.promotion.text.x : PLANNER_LIMITS.caption.max;
  const caption = [trimLine(input.title, 120), note ?? '', input.link ?? '']
    .filter(Boolean)
    .join(' ');
  const words = input.title.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [];
  return {
    caption: trimText(caption, max),
    hashtags: [...new Set(words)].slice(0, 3),
    model: 'fake',
  };
}
