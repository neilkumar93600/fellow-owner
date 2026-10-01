import { LIMITS, PITCH_TYPE_LABELS } from '@fellow-owners/shared';
import { z } from 'zod';
import {
  containsContactDetails,
  plainLine,
  tasteProfileBlock,
  trimText,
  UNTRUSTED_DATA_RULES,
  unsupportedClaims,
  untrustedBlock,
  voiceSamplesBlock,
} from '../guard.js';
import { type AiRuntime, runAiTask } from '../run.js';
import type { AiContext, SuggestReplyInput, SuggestReplyOutput } from '../types.js';

/**
 * suggestReply (P1, fast tier): a reply draft to a pitch in the creator's voice, for the inbox
 * side panel. The creator edits and sends it; nothing is sent automatically. The draft never
 * commits to money, deals or dates and never contains contact details or links.
 * Not wired to a route yet.
 */

/** Drafts aim for this; the stored reply limit is LIMITS.pitch.reply.max. */
export const REPLY_TARGET_CHARS = 600;

export const suggestReplySchema = z.object({
  reply: z.string().describe(`The reply, at most ${REPLY_TARGET_CHARS} characters.`),
});

export function suggestReplyInstructions(creatorName: string): string {
  const creator = plainLine(creatorName) || 'the creator';
  return `You draft a reply from ${creator}, a creator on Fellow Owners, to a pitch a fan or a brand sent them. ${creator} reads and edits the draft before sending it in the app.

Rules:
- Write as ${creator}, first person, in their voice (use the voice samples for tone only).
- 2 to 5 sentences, at most ${REPLY_TARGET_CHARS} characters, specific to what the pitch asks.
- Never commit to money, deals, dates, calls or deliverables. Suggest a next step the creator can confirm later, such as asking for details.
- If the pitch clashes with a "never" line of the taste profile, decline politely and briefly.
- Never include email addresses, phone numbers, links or @handles. Replies stay in the app.
- No markdown. At most one emoji, and only if the voice samples use them.

${UNTRUSTED_DATA_RULES}

Respond with only a JSON object: {"reply": "..."}.`;
}

export function suggestReplyPrompt(input: SuggestReplyInput): string {
  const { pitch } = input;
  return [
    tasteProfileBlock(input.tasteProfile),
    '',
    voiceSamplesBlock(input.voice),
    '',
    `The pitch (type: ${PITCH_TYPE_LABELS[pitch.type]}):`,
    untrustedBlock(
      'pitch',
      `From: ${pitch.senderName}\nSubject: ${pitch.subject}\n\n${pitch.body}`,
      LIMITS.ai.inputCharsMax,
    ),
  ].join('\n');
}

function replyProblem(reply: string, input: SuggestReplyInput): string | null {
  if (!reply.trim()) return 'the reply is empty';
  if (containsContactDetails(reply)) return 'the reply contains an email address or phone number';
  const source = `${input.pitch.subject}\n${input.pitch.body}\n${input.pitch.senderName}`;
  const links = unsupportedClaims(reply, source).filter((claim) => !claim.startsWith('the number'));
  return links.length > 0 ? links.join('; ') : null;
}

export async function suggestReply(
  rt: AiRuntime,
  input: SuggestReplyInput,
  ctx: AiContext,
): Promise<SuggestReplyOutput> {
  const { output, model } = await runAiTask(rt, {
    task: 'suggestReply',
    tier: 'fast',
    ctx,
    instructions: suggestReplyInstructions(input.creatorName),
    prompt: suggestReplyPrompt(input),
    schema: suggestReplySchema,
    schemaName: 'reply_draft',
    temperature: 0.6,
    maxOutputTokens: 800,
    timeoutMs: 12_000,
    deadlineMs: 18_000,
    // Contact details or links are fatal on the last attempt: no draft beats a risky one.
    check: (raw) => replyProblem(raw.reply, input),
  });
  return { reply: trimText(output.reply, LIMITS.pitch.reply.max), model };
}
