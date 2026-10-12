import type { Platform, TasteProfile } from '@fellow-owners/shared';
import type { AiRuntime } from '../run.js';
import { type AiContext, AiUnavailableError } from '../types.js';

/**
 * captionDraft (F3 planner, fast tier): a caption for one planned post in the creator's voice, for
 * the creator to edit. Nothing is posted. Capped per space per day (TASK_CAPS.captionDraft =
 * PLANNER_LIMITS.captionDraftsPerDay); counts toward the space's AI budget.
 * Route: POST /api/spaces/:handle/planner/caption-draft.
 */

export interface CaptionDraftAiInput {
  title: string;
  platform: Platform;
  /** The creator's notes on the post: untrusted text to the model. */
  notes: string | null;
  link: string | null;
  creatorName: string;
  tasteProfile: TasteProfile;
  /** Voice samples (tasteProfile.voice). */
  voice: string[];
}

export interface CaptionDraftAiOutput {
  /** Within PLANNER_LIMITS.caption.max and the platform's own limit. */
  caption: string;
  /** Without '#', at most PLANNER_LIMITS.hashtagsMax. */
  hashtags: string[];
  model: string;
}

/**
 * Wave A stub: the live prompt is not written yet, so callers degrade as for "AI off" (the fake in
 * ai/fakes/caption-draft.ts answers without a key). B2 replaces this with a runAiTask call.
 */
export async function captionDraft(
  _rt: AiRuntime,
  _input: CaptionDraftAiInput,
  _ctx: AiContext,
): Promise<CaptionDraftAiOutput> {
  throw new AiUnavailableError('disabled', 'Caption drafts are not built yet', {
    task: 'captionDraft',
  });
}
