import {
  COMMUNITY_ICONS,
  type CommunityIcon,
  LIMITS,
  type LookupPlatform,
  PLATFORM_LOOKUP_LIMITS,
  type PlatformProfile,
  type PlatformRecentPost,
  type SetupCommunitySuggestion,
  type SetupSuggestions,
  TINTS,
  type Tint,
} from '@fellow-owners/shared';
import { z } from 'zod';
import { plainLine, trimLine, UNTRUSTED_DATA_RULES, untrustedBlock } from '../guard.js';
import { type AiRuntime, runAiTask } from '../run.js';
import type { AiContext, SuggestSetupInput, SuggestSetupOutput } from '../types.js';

/**
 * suggestSetup (fast tier, Round 4 §6): imported public profiles -> "What you love" lines, voice
 * quotes and up to 4 suggested groups for onboarding. The model only names groups and points at
 * post indices; buildSetupSuggestions counts the demand hint in code ("6 of your last 10 videos
 * are budget trips"), so no number in the output comes from the model.
 */

export const MAX_LOVES = 5;
export const MAX_VOICE = 3;
export const MAX_GROUPS = 4;
/** Caption characters shown to the model per post. */
const CAPTION_CHARS = 300;
/** "and they average 1.6x your views" only from this ratio up. */
const VIEWS_RATIO_MIN = 1.3;

/**
 * The onboarding community templates (web/components/onboarding/onboarding-templates.ts).
 * ponytail: copied names/icons/tints; move COMMUNITY_TEMPLATES into shared if they drift.
 */
const TEMPLATES: Array<[name: string, description: string, tint: Tint, icon: CommunityIcon]> = [
  ['Budget Travel', 'Trips on a shoestring, with the receipts.', 'peach', 'wallet'],
  ['Solo Travelers', 'Going it alone, never lonely.', 'lavender', 'backpack'],
  ['Travel Photography', 'Shots, spots and gear talk.', 'aqua', 'camera'],
  ['Food Finds', 'The best bites, wherever you land.', 'peach', 'utensils'],
  ['Road Trips & Van Life', 'Long drives and small homes.', 'white', 'car'],
  ['Slow Living', 'Quiet mornings and unhurried days.', 'lavender', 'sunrise'],
  ['Home Cooks', 'Weeknight dinners and Sunday projects.', 'peach', 'utensils'],
  ['Bakers', 'Bread, pastry and patient dough.', 'lavender', 'heart'],
  ['Street Food', 'Stalls, carts and late-night bites.', 'aqua', 'globe'],
  ['Plant-Based', 'Cooking with what grows.', 'aqua', 'leaf'],
  ['Restaurant Hunters', 'Where to book and where to skip.', 'white', 'users'],
  ['Strength Crew', 'Programs, form checks and PRs.', 'peach', 'dumbbell'],
  ['Runners', 'Easy miles, race days and shoe talk.', 'aqua', 'sunrise'],
  ['Home Workouts', 'No gym, no excuses.', 'lavender', 'heart'],
  ['Outdoor Training', 'Trails, parks and open air.', 'aqua', 'leaf'],
  ['Accountability Buddies', 'Check in, show up, repeat.', 'white', 'users'],
  ['Songwriters', 'Drafts, lyrics and honest feedback.', 'lavender', 'pen-tool'],
  ['Producers', 'Beats, mixes and plug-in talk.', 'aqua', 'music'],
  ['Live Shows', 'Gigs, tours and front-row stories.', 'peach', 'mic'],
  ['Covers & Collabs', 'Play it your way, together.', 'white', 'users'],
  ['Gear Heads', 'Instruments, pedals and studio setups.', 'peach', 'camera'],
  ['Skincare', 'Routines that work, no hype.', 'aqua', 'leaf'],
  ['Makeup Looks', 'Everyday glam and bold ideas.', 'peach', 'palette'],
  ['Hair Days', 'Cuts, care and styling tricks.', 'lavender', 'heart'],
  ['Nail Art', 'Small canvases, big ideas.', 'peach', 'pen-tool'],
  ['Clean Beauty', 'Ingredients explained plainly.', 'white', 'book-open'],
];

const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '');
const TEMPLATE_BY_KEY = new Map(TEMPLATES.map((t) => [key(t[0]), t]));

export interface NumberedPost {
  platform: LookupPlatform;
  post: PlatformRecentPost;
}

/** The posts the model sees, numbered 0..n-1 in this order (profiles in input order). */
export function flattenRecent(profiles: readonly PlatformProfile[]): NumberedPost[] {
  return profiles
    .slice(0, PLATFORM_LOOKUP_LIMITS.profilesMax)
    .flatMap((profile) =>
      profile.recent
        .slice(0, PLATFORM_LOOKUP_LIMITS.recentMax)
        .map((post) => ({ platform: profile.platform, post })),
    );
}

export const suggestSetupSchema = z.object({
  loves: z.array(z.string()).describe('3 to 5 short "what I love making" lines.'),
  voice: z.array(z.string()).describe('2 or 3 sentences copied word for word from captions.'),
  groups: z
    .array(
      z.object({
        name: z.string().describe('Community name, 2-40 characters; reuse a template name.'),
        description: z.string().describe('One short line, under 120 characters.'),
        topic: z.string().describe('Plural noun phrase, e.g. "budget trips".'),
        icon: z.enum(COMMUNITY_ICONS),
        tint: z.enum(TINTS),
        posts: z.array(z.number().int()).describe('Indices of the posts that fit this group.'),
      }),
    )
    .describe('Up to 4 fan communities, most posts first.'),
});

export const suggestSetupInstructions = `You help a creator set up Fellow Owners, where their fans join interest-based communities. You read the creator's public profiles and their recent posts, which are numbered [0], [1], ...

Return:
- loves: 3 to ${MAX_LOVES} short lines (under 100 characters each) in the first person about what the creator loves making or would happily promote, based on what they actually post. No hashtags, no emoji.
- voice: 2 or ${MAX_VOICE} sentences copied exactly, word for word, from the captions, that sound most like the creator. Never rewrite or invent them.
- groups: up to ${MAX_GROUPS} fan communities that the posts suggest, each listing the indices of the posts that fit it in "posts". Prefer these template names when one fits, spelled exactly: ${TEMPLATES.map((t) => t[0]).join(', ')}. "topic" is a short plural noun phrase for what those posts are about, such as "budget trips" or "solo trips".

Do not count, estimate or state any numbers; only list post indices.

${UNTRUSTED_DATA_RULES}

Respond with only a JSON object: {"loves": [...], "voice": [...], "groups": [{"name": "", "description": "", "topic": "", "icon": "", "tint": "", "posts": [0]}]}.`;

export function suggestSetupPrompt(input: SuggestSetupInput): string {
  const lines: string[] = [];
  for (const profile of input.profiles.slice(0, PLATFORM_LOOKUP_LIMITS.profilesMax)) {
    lines.push(
      `Profile on ${profile.platform}:`,
      untrustedBlock(
        `${profile.platform} profile`,
        `${profile.displayName ?? profile.handle}\n${profile.bio ?? ''}`,
        600,
      ),
    );
  }
  lines.push('', 'Recent posts, newest first per platform:');
  flattenRecent(input.profiles).forEach(({ platform, post }, index) => {
    const views = post.views === null ? '' : `, ${post.views} views`;
    lines.push(
      `[${index}] (${platform}${views})`,
      untrustedBlock('caption', post.title, CAPTION_CHARS),
    );
  });
  return lines.join('\n');
}

const VIDEO_PLATFORMS = new Set<LookupPlatform>(['youtube', 'tiktok']);

function average(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
}

function demandFor(
  indices: readonly number[],
  posts: readonly NumberedPost[],
  topic: string,
): SetupCommunitySuggestion['demand'] {
  const picked = [...new Set(indices)].filter(
    (i) => Number.isInteger(i) && i >= 0 && i < posts.length,
  );
  if (picked.length < 2) return null;
  const noun = posts.every((p) => VIDEO_PLATFORMS.has(p.platform)) ? 'videos' : 'posts';
  let label = `${picked.length} of your last ${posts.length} ${noun} are ${topic}`;
  const viewsOf = (list: readonly NumberedPost[]) =>
    list.flatMap(({ post }) => (post.views === null ? [] : [post.views]));
  const group = viewsOf(picked.map((i) => posts[i] as NumberedPost));
  const all = viewsOf(posts);
  const groupAvg = group.length >= 2 ? average(group) : null;
  const allAvg = average(all);
  if (groupAvg !== null && allAvg) {
    const ratio = Math.round((groupAvg / allAvg) * 10) / 10;
    if (ratio >= VIEWS_RATIO_MIN) label += `, and they average ${ratio}x your views`;
  }
  return { count: picked.length, of: posts.length, label };
}

const squash = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * The model's raw output -> SetupSuggestions: lists capped, voice kept only when quoted verbatim,
 * template names mapped to their icons and tints, demand counted from the indices.
 * avatarUrl is left null: the controller fetches it (allowlisted CDN only).
 */
export function buildSetupSuggestions(
  profiles: readonly PlatformProfile[],
  raw: SuggestSetupOutput,
): SetupSuggestions {
  const posts = flattenRecent(profiles);
  const captions = [...posts.map(({ post }) => post.title), ...profiles.map((p) => p.bio ?? '')]
    .map(squash)
    .join('\n');

  const loves = [
    ...new Set(raw.loves.map((line) => trimLine(line, LIMITS.tasteProfile.lineMax))),
  ].filter(Boolean);

  const voice = [...new Set(raw.voice.map((line) => plainLine(line)))].filter(
    (line) =>
      line.length >= 10 &&
      line.length <= LIMITS.tasteProfile.voiceSampleMax &&
      captions.includes(squash(line)),
  );

  const seen = new Set<string>();
  const communities: SetupCommunitySuggestion[] = [];
  for (const group of raw.groups) {
    const template = TEMPLATE_BY_KEY.get(key(group.name));
    const name = template?.[0] ?? trimLine(group.name, LIMITS.community.name.max);
    if (name.length < LIMITS.community.name.min || seen.has(key(name))) continue;
    seen.add(key(name));
    const topic = trimLine(group.topic, 60).toLowerCase() || name.toLowerCase();
    communities.push({
      name,
      description: template?.[1] ?? trimLine(group.description, LIMITS.community.description.max),
      tint: template?.[2] ?? group.tint,
      icon: template?.[3] ?? group.icon,
      demand: demandFor(group.posts, posts, topic),
    });
    if (communities.length >= MAX_GROUPS) break;
  }

  const first = <T>(pick: (p: PlatformProfile) => T | null) =>
    profiles.map(pick).find((value) => value !== null && value !== undefined && value !== '') ??
    null;

  return {
    displayName: first((p) => p.displayName?.slice(0, LIMITS.space.displayName.max) ?? null),
    avatarUrl: null,
    bio: first((p) => (p.bio ? trimLine(p.bio, LIMITS.space.bio.max) : null)),
    loves: loves.slice(0, MAX_LOVES),
    voice: voice.slice(0, MAX_VOICE),
    communities,
  };
}

export async function suggestSetup(
  rt: AiRuntime,
  input: SuggestSetupInput,
  ctx: AiContext,
): Promise<SuggestSetupOutput> {
  const { output, model } = await runAiTask(rt, {
    task: 'suggestSetup',
    tier: 'fast',
    ctx,
    instructions: suggestSetupInstructions,
    prompt: suggestSetupPrompt(input),
    schema: suggestSetupSchema,
    schemaName: 'setup_suggestions',
    temperature: 0.3,
    maxOutputTokens: 1_200,
    // Interactive (onboarding): fail fast; the UI keeps the manual path.
    timeoutMs: 15_000,
    deadlineMs: 22_000,
  });
  return { ...output, model };
}
