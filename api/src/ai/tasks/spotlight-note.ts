import { z } from 'zod';
import {
  containsContactDetails,
  plainLine,
  trimText,
  UNTRUSTED_DATA_RULES,
  unsupportedClaims,
  untrustedBlock,
  voiceSamplesBlock,
} from '../guard.js';
import { type AiRuntime, runAiTask } from '../run.js';
import type { AiContext, SpotlightNoteInput, SpotlightNoteOutput } from '../types.js';

/**
 * spotlightNote (fast tier, F6 "Fans of the week"): a short public shout-out to one fan in the
 * creator's voice, built from the fan's name, intro, communities and top post. The creator edits
 * and approves it; nothing is posted automatically. No contact details, links or @handles.
 */

/** memberships.spotlight_note CHECK (char_length <= 280). */
export const SPOTLIGHT_NOTE_MAX = 280;

export const spotlightNoteSchema = z.object({
  note: z.string().describe(`The shout-out, at most ${SPOTLIGHT_NOTE_MAX} characters.`),
});

export function spotlightNoteInstructions(creatorName: string): string {
  const creator = plainLine(creatorName) || 'the creator';
  return `You draft a short public shout-out from ${creator}, a creator on Fellow Owners, to one of their fans. It appears under "Fans of the week" on ${creator}'s page after ${creator} edits and approves it.

Rules:
- Write as ${creator}, first person, in their voice (use the voice samples for tone only).
- 1 to 3 sentences, at most ${SPOTLIGHT_NOTE_MAX} characters. Name the fan and thank them for something specific from their intro, communities or top post.
- Only state facts given below. Never invent numbers, places or achievements.
- Never include email addresses, phone numbers, links or @handles.
- No markdown and no hashtags. At most one emoji, and only if the voice samples use them.

${UNTRUSTED_DATA_RULES}

Respond with only a JSON object: {"note": "..."}.`;
}

export function spotlightNotePrompt(input: SpotlightNoteInput): string {
  const { fan } = input;
  const facts = [
    `Name: ${fan.name}`,
    `Communities: ${fan.communities.length > 0 ? fan.communities.join(', ') : '(none)'}`,
    `Intro: ${fan.intro ?? '(none)'}`,
    fan.topPost ? `Top post: ${fan.topPost.title}\n${fan.topPost.excerpt}` : 'Top post: (none)',
  ].join('\n');
  return [voiceSamplesBlock(input.voice), '', 'The fan:', untrustedBlock('fan', facts, 2000)].join(
    '\n',
  );
}

function sourceText(input: SpotlightNoteInput): string {
  const { fan } = input;
  return [
    fan.name,
    fan.intro ?? '',
    ...fan.communities,
    fan.topPost?.title ?? '',
    fan.topPost?.excerpt ?? '',
  ].join('\n');
}

function noteProblem(note: string, input: SpotlightNoteInput): string | null {
  if (!note.trim()) return 'the note is empty';
  if (note.length > SPOTLIGHT_NOTE_MAX) return `the note is over ${SPOTLIGHT_NOTE_MAX} characters`;
  if (containsContactDetails(note)) return 'the note contains an email address or phone number';
  const claims = unsupportedClaims(note, sourceText(input));
  return claims.length > 0 ? claims.join('; ') : null;
}

export async function spotlightNote(
  rt: AiRuntime,
  input: SpotlightNoteInput,
  ctx: AiContext,
): Promise<SpotlightNoteOutput> {
  const { output, model } = await runAiTask(rt, {
    task: 'spotlightNote',
    tier: 'fast',
    ctx,
    instructions: spotlightNoteInstructions(input.creatorName),
    prompt: spotlightNotePrompt(input),
    schema: spotlightNoteSchema,
    schemaName: 'spotlight_note',
    temperature: 0.7,
    maxOutputTokens: 400,
    timeoutMs: 12_000,
    deadlineMs: 18_000,
    check: (raw) => noteProblem(raw.note, input),
  });
  return { note: trimText(output.note, SPOTLIGHT_NOTE_MAX), model };
}
