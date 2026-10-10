import {
  LIMITS,
  POST_STATUS_LABELS,
  POST_TYPE_LABELS,
  PROMOTION_PLATFORMS,
  type PromotionDraft,
  type PromotionPlatform,
} from '@fellow-owners/shared';
import { z } from 'zod';
import {
  composedDraftLength,
  fitsPlatform,
  linkHosts,
  normalizeHashtags,
  plainLine,
  shortenBySentences,
  splitTrailingHashtags,
  stripInvisible,
  tasteProfileBlock,
  trimLine,
  UNTRUSTED_DATA_RULES,
  unsupportedClaims,
  untrustedBlock,
  voiceSamplesBlock,
} from '../guard.js';
import { type AiRuntime, runAiTask } from '../run.js';
import type { AiContext, PromoteDraftsInput, PromoteDraftsOutput } from '../types.js';

/**
 * promoteDrafts (smart tier, 02-trd data flow 4): one draft per platform in the creator's
 * voice, within each platform's limit counting hashtags and the short link (X counts the link
 * as 23 characters). Drafts may only state facts from the post; numbers, links and @handles
 * that are not in the source fail the platform. Platforms that fail end up in `failed`
 * (Promotion.draftErrors: "Couldn't draft" + Retry). Capped at 10 calls per space per day.
 */

interface PlatformGuide {
  name: string;
  rule: string;
  /** Hashtags kept for this platform (<= LIMITS.promotion.hashtags.max). */
  maxHashtags: number;
}

export const PLATFORM_GUIDES: Record<PromotionPlatform, PlatformGuide> = {
  x: {
    name: 'X',
    rule: 'one post of at most 220 characters before hashtags; punchy, one idea; 0 to 2 hashtags',
    maxHashtags: 2,
  },
  instagram: {
    name: 'Instagram',
    rule: 'a caption of 600 to 1,200 characters in short paragraphs with line breaks; end with a call to action pointing to the link in bio; 3 to 5 hashtags',
    maxHashtags: 5,
  },
  linkedin: {
    name: 'LinkedIn',
    rule: '700 to 1,300 characters, professional but personal, short paragraphs; end with a question or a call to action; 0 to 3 hashtags',
    maxHashtags: 3,
  },
  youtube: {
    name: 'YouTube community post',
    rule: '300 to 800 characters, conversational; may ask viewers a question; 0 to 3 hashtags',
    maxHashtags: 3,
  },
};

export interface RawDraft {
  text: string;
  hashtags: string[];
}

export interface RawPromoteDrafts {
  headline: string;
  drafts: Partial<Record<PromotionPlatform, RawDraft>>;
}

const draftSchema = z.object({
  text: z.string().describe('The post text, without hashtags and without links.'),
  hashtags: z.array(z.string()).describe('Words only, without the # sign, no spaces.'),
});

/** Only the requested platforms are keys (all required), so strict structured output works. */
export function promoteDraftsSchema(
  platforms: readonly PromotionPlatform[],
): z.ZodType<RawPromoteDrafts> {
  const shape: Record<string, typeof draftSchema> = {};
  for (const platform of platforms) shape[platform] = draftSchema;
  return z.object({
    headline: z
      .string()
      .describe(`Showcase headline, at most ${LIMITS.promotion.headline.max} characters.`),
    drafts: z.object(shape),
  }) as z.ZodType<RawPromoteDrafts>;
}

export function promoteDraftsInstructions(
  creatorName: string,
  platforms: readonly PromotionPlatform[],
): string {
  const creator = plainLine(creatorName) || 'the creator';
  const rules = platforms
    .map(
      (platform) =>
        `- ${platform} (${PLATFORM_GUIDES[platform].name}): ${PLATFORM_GUIDES[platform].rule}`,
    )
    .join('\n');
  return `You write social posts for ${creator}, a creator, to promote a project or idea from one of their communities on Fellow Owners. ${creator} reviews and edits every draft before posting; nothing is published automatically.

Voice:
- Write in the first person as ${creator}, in their voice. Use the voice samples only for tone, rhythm, sentence length, punctuation and emoji habits. Never copy their sentences or the facts in them.

Facts:
- Use only facts stated in the post data: its title, body, stage, community, author, team and open roles. Never invent numbers, users, revenue, dates, launches, partners, quotes, features or results.
- Describe the stage honestly. An idea or an open project is not launched or built yet.
- Credit the author by the name given in the post data and say it comes from the community named there.
- If roles are open, you may invite people to join the team for those roles.
- Respect the "never" lines of the taste profile; do not frame the project in those terms.
- Do not write URLs, @handles or link placeholders. The app adds the tracked short link to every post.

Platforms (write exactly these):
${rules}
- hashtags: words only, without the # sign and without spaces, for example "BuildInPublic". Do not repeat them in the text.

headline: a headline for the public showcase page, at most ${LIMITS.promotion.headline.max} characters, no emojis, no hashtags.

${UNTRUSTED_DATA_RULES}

Respond with only a JSON object: {"headline": "...", "drafts": {${platforms.map((p) => `"${p}": {"text": "...", "hashtags": ["..."]}`).join(', ')}}}.`;
}

export function promoteDraftsPrompt(
  input: PromoteDraftsInput,
  platforms: readonly PromotionPlatform[],
): string {
  const { post } = input;
  const team =
    input.team.length > 0
      ? input.team
          .map((member) => `${plainLine(member.name)} (${plainLine(member.role)})`)
          .join(', ')
      : 'none yet';
  const hosts = linkHosts(post.links);
  const postData = [
    `Title: ${post.title}`,
    `Type: ${POST_TYPE_LABELS[post.type]}; stage: ${POST_STATUS_LABELS[post.status]}`,
    `Community: ${post.communityName}`,
    `Author: ${post.authorName}`,
    `Open roles: ${post.rolesNeeded.length > 0 ? post.rolesNeeded.join(', ') : 'none'}`,
    `Team: ${team}`,
    ...(hosts.length > 0 ? [`Links to: ${hosts.join(', ')}`] : []),
    'Body:',
    post.body,
  ].join('\n');
  return [
    `Creator: ${plainLine(input.creatorName) || 'the creator'}`,
    `Platforms to write: ${platforms.join(', ')}`,
    '',
    tasteProfileBlock(input.tasteProfile),
    '',
    voiceSamplesBlock(input.voice),
    '',
    'The post to promote (written by a community member):',
    untrustedBlock('post', postData, LIMITS.ai.inputCharsMax + 1_000),
  ].join('\n');
}

/** Everything a draft may state: the post, its team and roles, the community, the creator. */
export function draftSource(input: PromoteDraftsInput): string {
  const { post } = input;
  return [
    input.creatorName,
    post.title,
    post.body,
    post.communityName,
    post.authorName,
    POST_STATUS_LABELS[post.status],
    ...post.rolesNeeded,
    ...post.links.flatMap((link) => [link.label, link.url]),
    ...input.team.flatMap((member) => [member.name, member.role]),
    ...input.tasteProfile.promote,
    input.showcaseUrl ?? '',
  ].join('\n');
}

const LINK_PLACEHOLDER = /\[(?:short\s*)?link\]|\{(?:short_?)?link\}|<(?:short\s*)?link>/gi;

function cleanDraftText(text: string, showcaseUrl: string | null | undefined): string {
  let clean = stripInvisible(text.replace(/\r\n?/g, '\n')).replace(LINK_PLACEHOLDER, '');
  if (showcaseUrl) clean = clean.split(showcaseUrl).join('');
  return clean
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export type DraftOutcome = { ok: true; draft: PromotionDraft } | { ok: false; problem: string };

/**
 * One platform's draft, cleaned and checked: hashtags normalized (trailing ones moved out of
 * the text), link placeholders removed, unsupported claims rejected, and the composed length
 * fitted by dropping hashtags, then whole trailing sentences. Never cuts mid-sentence.
 */
export function finalizeDraft(
  platform: PromotionPlatform,
  raw: RawDraft | undefined,
  input: PromoteDraftsInput,
): DraftOutcome {
  if (!raw) return { ok: false, problem: `${platform}: the draft is missing` };
  const split = splitTrailingHashtags(cleanDraftText(raw.text, input.showcaseUrl));
  let text = split.text;
  let hashtags = normalizeHashtags(
    [...raw.hashtags, ...split.hashtags],
    PLATFORM_GUIDES[platform].maxHashtags,
  );
  if (!text) return { ok: false, problem: `${platform}: the text is empty` };

  const allowedUrls = [
    ...input.post.links.map((link) => link.url),
    ...(input.showcaseUrl ? [input.showcaseUrl] : []),
  ];
  const claims = unsupportedClaims(text, draftSource(input), allowedUrls);
  if (claims.length > 0) return { ok: false, problem: `${platform}: ${claims.join('; ')}` };

  while (!fitsPlatform(platform, { text, hashtags }) && hashtags.length > 0) {
    hashtags = hashtags.slice(0, -1);
  }
  if (!fitsPlatform(platform, { text, hashtags })) {
    const shortened = shortenBySentences(text, (candidate) =>
      fitsPlatform(platform, { text: candidate, hashtags: [] }),
    );
    if (!shortened) {
      const limit = LIMITS.promotion.text[platform];
      const length = composedDraftLength(platform, { text, hashtags: [] });
      return {
        ok: false,
        problem: `${platform}: the post is ${length} characters with the link; it must fit in ${limit}`,
      };
    }
    text = shortened;
    hashtags = [];
  }
  return { ok: true, draft: { text, hashtags } };
}

function requestedPlatforms(input: PromoteDraftsInput): PromotionPlatform[] {
  const wanted =
    input.platforms && input.platforms.length > 0 ? input.platforms : PROMOTION_PLATFORMS;
  return PROMOTION_PLATFORMS.filter((platform) => wanted.includes(platform));
}

/** Splits the model's answer into kept drafts and failed platforms; picks a safe headline. */
export function normalizePromoteDrafts(
  raw: RawPromoteDrafts,
  input: PromoteDraftsInput,
  model: string,
): PromoteDraftsOutput & { problems: string[] } {
  const drafts: PromoteDraftsOutput['drafts'] = {};
  const failed: PromotionPlatform[] = [];
  const problems: string[] = [];
  for (const platform of requestedPlatforms(input)) {
    const outcome = finalizeDraft(platform, raw.drafts[platform], input);
    if (outcome.ok) drafts[platform] = outcome.draft;
    else {
      failed.push(platform);
      problems.push(outcome.problem);
    }
  }
  const max = LIMITS.promotion.headline.max;
  const headline = trimLine(raw.headline.replace(/#[\p{L}\p{N}_]+/gu, ''), max);
  const headlineOk =
    headline.length > 0 && unsupportedClaims(headline, draftSource(input)).length === 0;
  return {
    drafts,
    failed,
    headline: headlineOk ? headline : trimLine(input.post.title, max),
    model,
    problems,
  };
}

export async function promoteDrafts(
  rt: AiRuntime,
  input: PromoteDraftsInput,
  ctx: AiContext,
): Promise<PromoteDraftsOutput> {
  const platforms = requestedPlatforms(input);
  const { output, model } = await runAiTask(rt, {
    task: 'promoteDrafts',
    tier: 'smart',
    ctx,
    instructions: promoteDraftsInstructions(input.creatorName, platforms),
    prompt: promoteDraftsPrompt(input, platforms),
    schema: promoteDraftsSchema(platforms),
    schemaName: 'promotion_drafts',
    schemaDescription: 'Social media drafts promoting one community post',
    temperature: 0.7,
    maxOutputTokens: 2_500,
    timeoutMs: 25_000,
    deadlineMs: 40_000,
    // Retry once with the per-platform problems; afterwards, failing platforms go to `failed`.
    check: (raw, final) => {
      if (final) return null;
      const { problems } = normalizePromoteDrafts(raw, input, '');
      return problems.length > 0 ? problems.join('; ') : null;
    },
  });
  const { problems, ...result } = normalizePromoteDrafts(output, input, model);
  if (problems.length > 0) {
    rt.logger.info({ task: 'promoteDrafts', failed: result.failed, problems }, 'drafts rejected');
  }
  return result;
}
