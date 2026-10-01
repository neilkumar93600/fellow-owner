import {
  DAILY_CAPS,
  HOURLY_CAPS,
  LIMITS,
  PITCH_TYPES,
  type PitchType,
  POST_TYPES,
  type PostType,
  PROMOTION_PLATFORMS,
  type PromotionDraft,
  type PromotionPlatform,
  type TasteProfile,
} from '@fellow-owners/shared';
import { hoursAgo, startOfUtcDay } from '../lib/dates.js';
import type { AiRunsRepo } from '../repositories/ai-runs.repo.js';
import {
  type AiContext,
  type AiServices,
  type AiTaskName,
  AiUnavailableError,
  type AiUnavailableReason,
  type BriefingInput,
  type BriefingOutput,
  type CommunityDigestInput,
  type CommunityDigestOutput,
  type Embedding,
  type EmbedInput,
  type PromoteDraftsInput,
  type PromoteDraftsOutput,
  type SuggestCommunitiesInput,
  type SuggestCommunitiesOutput,
  type SuggestReplyInput,
  type SuggestReplyOutput,
  type TriageInput,
  type TriageResult,
} from './types.js';

/**
 * Deterministic, offline AiServices: used when AI is disabled (no OPENROUTER_API_KEY) and in
 * tests. Same input -> same output. Keyword rules stand in for the model:
 * - spam: "DM me", WhatsApp/Telegram, giveaways, "click here", more than 2 links, shouting
 * - category: keyword families (investment, press, collab, fan note, idea), else the chosen type
 * - fit: 45 + 15 per matching "promote" line - 30 per matching "never" line (+ small bonuses)
 * With `accounting`, it also behaves like ai/run.ts: budget and cap checks against ai_runs and
 * one ai_runs row per call (model `fake`, tokens estimated at 4 chars per token).
 */

export const FAKE_MODEL = 'fake';

export interface FakeAiOptions {
  accounting?: { aiRuns: AiRunsRepo };
  /** Force tasks to fail with AiUnavailableError(reason) (tests of degraded paths). */
  failTasks?: Partial<Record<AiTaskName, AiUnavailableReason>>;
}

// ---------------------------------------------------------------- text helpers

const STOPWORDS = new Set(
  'a an and are as at be but by for from has have i in into is it its me my of on or our so that the their them they this to up us was we what when who will with you your about just more than very like only also'.split(
    ' ',
  ),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9+#]+/)
    .filter((token) => token.length > 1);
}

function significant(text: string): string[] {
  return tokenize(text).filter((token) => token.length >= 4 && !STOPWORDS.has(token));
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

function firstSentence(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const match = clean.match(/^(.+?[.!?])(\s|$)/);
  return match?.[1] ?? clean;
}

function containsWord(haystackTokens: Set<string>, word: string): boolean {
  if (haystackTokens.has(word)) return true;
  // Light stemming: "lifts" matches "lift", "builders" matches "build".
  for (const token of haystackTokens) {
    if (
      token.length >= 4 &&
      word.length >= 4 &&
      (token.startsWith(word) || word.startsWith(token))
    ) {
      return true;
    }
  }
  return false;
}

function estimateTokens(value: unknown): number {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return Math.ceil(text.length / 4);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------- triage

const SPAM_PATTERNS: RegExp[] = [
  /\bdm me\b/i,
  /\bwhats\s?app\b/i,
  /\btelegram\b/i,
  /\bgiveaway\b/i,
  /\bfree followers\b/i,
  /\bbuy followers\b/i,
  /\bclick (here|the link|this link)\b/i,
  /\bearn \$?\d/i,
  /\bguaranteed (profit|returns|income)\b/i,
  /\b(crypto|forex|bitcoin)\b.*\b(double|profit|returns|signal)/i,
  /\bpromo code\b/i,
  /\bact now\b/i,
];

const PITCH_KEYWORDS: Array<[PitchType, RegExp]> = [
  [
    'investment',
    /\b(invest(or|ors|ment|ing)?|funding|fundrais\w*|angel|pre-?seed|seed round|series [ab]|vc|venture|equity|valuation|term sheet|cap table)\b/i,
  ],
  [
    'press',
    /\b(journalist|reporter|interview|press|article|podcast|magazine|newsletter|editor|feature story|documentary)\b/i,
  ],
  [
    'collab',
    /\b(collab\w*|partner\w*|sponsor\w*|brand deal|campaign|co-?create|joint|feature together|ambassador)\b/i,
  ],
  [
    'fan_note',
    /\b(big fan|love your|thank you|thanks for|inspired|you changed|just wanted to say|your videos|been watching)\b/i,
  ],
  ['idea', /\b(idea|app|tool|what if|build|product|platform|feature request|prototype)\b/i],
];

const TAG_LEXICON: Array<[string, RegExp]> = [
  ['fitness', /\b(fitness|gym|workout|lift\w*|training|running|yoga)\b/i],
  ['music', /\b(music|song|beats?|producer|album|dj)\b/i],
  ['design', /\b(design\w*|figma|ui|ux|brand(ing)?)\b/i],
  ['ai', /\b(ai|llm|machine learning|gpt|model)\b/i],
  ['app', /\b(app|ios|android|mobile|web app|saas)\b/i],
  ['community', /\b(community|meetup|members|club)\b/i],
  ['education', /\b(course|learn\w*|teach\w*|tutorial|education|school)\b/i],
  ['climate', /\b(climate|sustainab\w*|green|carbon|recycl\w*)\b/i],
  ['local', /\b(local|neighbou?rhood|city|volunteer\w*)\b/i],
  ['video', /\b(video|youtube|reels?|shorts|editing)\b/i],
  ['finance', /\b(finance|budget\w*|money|invest\w*|fintech)\b/i],
  ['health', /\b(health|nutrition|sleep|mental|wellness)\b/i],
  ['gaming', /\b(gam(e|es|ing)|esports|twitch)\b/i],
];

const SKILL_LEXICON = [
  'react',
  'next.js',
  'typescript',
  'javascript',
  'python',
  'node',
  'swift',
  'kotlin',
  'flutter',
  'figma',
  'ui design',
  'ux research',
  'product design',
  'video editing',
  'motion design',
  'photography',
  'illustration',
  'copywriting',
  'marketing',
  'seo',
  'sales',
  'fundraising',
  'product management',
  'community management',
  'data science',
  'machine learning',
  'music production',
  'sound design',
  'coaching',
  'nutrition',
];

function detectSpam(input: TriageInput): { spam: boolean; why: string | null } {
  const text = `${input.title}\n${input.body}`;
  const pattern = SPAM_PATTERNS.find((re) => re.test(text));
  if (pattern) return { spam: true, why: 'uses phrases common in spam' };
  const urlCount = (input.body.match(/https?:\/\//gi) ?? []).length + input.links.length;
  if (urlCount > 2) return { spam: true, why: 'is mostly links' };
  const letters = text.replace(/[^a-z]/gi, '');
  const upper = letters.replace(/[^A-Z]/g, '');
  if (letters.length >= 20 && upper.length / letters.length > 0.6) {
    return { spam: true, why: 'is written in capitals' };
  }
  if (/!{3,}|\${2,}/.test(text)) return { spam: true, why: 'reads like a sales blast' };
  return { spam: false, why: null };
}

function categorize(input: TriageInput): PostType | PitchType {
  const text = `${input.title}\n${input.body}`;
  if (input.kind === 'inbound') {
    const found = PITCH_KEYWORDS.find(([, re]) => re.test(text));
    return found ? found[0] : (input.type as PitchType);
  }
  if (
    input.type !== 'project' &&
    /\b(looking for|join (my|our|the) team|co-?founder|need a (designer|developer|dev|editor))\b/i.test(
      text,
    )
  ) {
    return 'project';
  }
  if (input.type === 'idea' && /\?\s*$/.test(input.title.trim())) return 'discussion';
  return input.type as PostType;
}

function scoreFit(
  input: TriageInput,
  spam: boolean,
): { score: number; reason: string; matched: string | null } {
  const tokens = new Set(tokenize(`${input.title} ${input.body}`));
  const taste: TasteProfile = input.tasteProfile;
  let score = 45;
  let reason = 'No strong match with your taste profile yet.';
  let matched: string | null = null;

  let promoteHits = 0;
  for (const line of taste.promote) {
    if (significant(line).some((word) => containsWord(tokens, word))) {
      promoteHits += 1;
      if (!matched) matched = line;
    }
  }
  score += Math.min(3, promoteHits) * 15;
  if (matched) reason = `Matches "${truncate(matched, 80)}" from your taste profile.`;

  for (const line of taste.never) {
    if (significant(line).some((word) => containsWord(tokens, word))) {
      score -= 30;
      reason = `Touches "${truncate(line, 80)}", which you never promote.`;
      break;
    }
  }

  if (input.body.length > 300) score += 5;
  if (input.links.length > 0) score += 3;
  if (input.kind === 'inbound' && (input.type === 'collab' || input.type === 'investment')) {
    score += 5;
  }
  if (input.kind === 'inbound' && input.type === 'fan_note') score -= 10;
  if (spam) {
    score = Math.min(score, 5);
    reason = 'Looks like spam, so it was filtered.';
  }
  return { score: Math.max(0, Math.min(100, Math.round(score))), reason, matched };
}

export function fakeTriage(input: TriageInput): TriageResult {
  const body = input.body.slice(0, LIMITS.ai.inputCharsMax);
  const clipped = { ...input, body };
  const { spam, why } = detectSpam(clipped);
  const category = categorize(clipped);
  const fit = scoreFit(clipped, spam);
  const text = `${input.title}\n${body}`;
  const lowered = text.toLowerCase();
  const tags = TAG_LEXICON.filter(([, re]) => re.test(text))
    .map(([tag]) => tag)
    .slice(0, LIMITS.ai.tagsMax);
  const skills = SKILL_LEXICON.filter((skill) => lowered.includes(skill)).slice(
    0,
    LIMITS.ai.skillsMax,
  );
  const sentence = firstSentence(body);
  const summaryBase = sentence.length >= 20 ? sentence : `${input.title}: ${sentence}`;
  return {
    category,
    isSpam: spam,
    summary: truncate(spam && why ? `Filtered: ${why}.` : summaryBase, LIMITS.ai.summaryMax),
    fitScore: fit.score,
    fitReason: truncate(fit.reason, LIMITS.ai.fitReasonMax),
    tags,
    skills,
  };
}

// ---------------------------------------------------------------- embedding

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Hashed bag-of-words, L2-normalized: similar texts get similar vectors (cosine). */
export function fakeEmbedding(
  text: string,
  dimensions: number = LIMITS.ai.embeddingDimensions,
): Embedding {
  const vector = new Array<number>(dimensions).fill(0);
  for (const token of tokenize(text)) {
    if (STOPWORDS.has(token)) continue;
    const hash = fnv1a(token);
    const index = hash % dimensions;
    vector[index] = (vector[index] ?? 0) + ((hash >>> 16) & 1 ? 1 : -1);
  }
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) {
    vector[0] = 1;
    return vector;
  }
  return vector.map((v) => Math.round((v / norm) * 1e6) / 1e6);
}

// ---------------------------------------------------------------- suggestCommunities

const COMMUNITY_SYNONYMS: Record<string, string[]> = {
  build: [
    'dev',
    'developer',
    'engineer',
    'code',
    'coding',
    'coder',
    'frontend',
    'backend',
    'fullstack',
    'software',
    'app',
    'apps',
    'hacker',
    'startup',
    'maker',
    'programmer',
  ],
  design: [
    'designer',
    'figma',
    'ui',
    'ux',
    'illustrator',
    'illustration',
    'brand',
    'visual',
    'graphic',
    'artist',
  ],
  invest: [
    'investor',
    'vc',
    'angel',
    'operator',
    'operators',
    'founder',
    'finance',
    'fund',
    'startup',
    'business',
  ],
  operator: ['founder', 'ops', 'business', 'manager', 'startup'],
  music: ['musician', 'producer', 'singer', 'song', 'songs', 'beats', 'dj', 'guitar', 'band'],
  creator: [
    'creator',
    'youtube',
    'youtuber',
    'video',
    'videos',
    'podcast',
    'streamer',
    'content',
    'influencer',
    'editor',
  ],
  fitness: [
    'gym',
    'lift',
    'lifts',
    'lifting',
    'workout',
    'run',
    'running',
    'runner',
    'yoga',
    'health',
    'training',
    'athlete',
    'sport',
    'sports',
  ],
  local: [
    'volunteer',
    'city',
    'neighborhood',
    'neighbourhood',
    'climate',
    'nonprofit',
    'impact',
    'community',
    'town',
  ],
  impact: ['volunteer', 'nonprofit', 'climate', 'social', 'charity', 'change'],
};

export function fakeSuggestCommunities(input: SuggestCommunitiesInput): SuggestCommunitiesOutput {
  const introTokens = new Set(tokenize(input.intro));
  const scored = input.communities.map((community) => {
    const own = tokenize(
      `${community.name} ${community.slug.replace(/-/g, ' ')} ${community.description ?? ''}`,
    ).filter((token) => !STOPWORDS.has(token));
    const expanded = new Set(own);
    for (const token of own) {
      for (const [key, synonyms] of Object.entries(COMMUNITY_SYNONYMS)) {
        if (token.startsWith(key)) for (const synonym of synonyms) expanded.add(synonym);
      }
    }
    let score = 0;
    for (const word of expanded)
      if (word.length >= 2 && containsWord(introTokens, word)) score += 1;
    return { slug: community.slug, score };
  });
  return {
    suggestions: scored
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
      .slice(0, 3)
      .map((entry) => ({
        slug: entry.slug,
        confidence: Math.min(0.95, Math.round((0.5 + 0.15 * entry.score) * 100) / 100),
      })),
  };
}

// ---------------------------------------------------------------- briefing

export function fakeBriefing(input: BriefingInput): BriefingOutput {
  const ranked = [...input.candidates].sort(
    (a, b) =>
      (b.fitScore ?? 50) - (a.fitScore ?? 50) ||
      (b.signals ?? 0) - (a.signals ?? 0) ||
      a.refId.localeCompare(b.refId),
  );
  const { min, max } = LIMITS.briefing.highlights;
  const picked = ranked.slice(
    0,
    Math.max(Math.min(min, ranked.length), Math.min(max, ranked.length)),
  );
  const { counts } = input;
  const headline = truncate(
    `${counts.newMembers7d} new members, ${counts.ideas7d} ideas and ${counts.pitches7d} pitches this week`,
    LIMITS.briefing.headlineMax,
  );
  const watchouts: string[] = [];
  if (counts.pendingAnalysis > 0) {
    watchouts.push(`${counts.pendingAnalysis} items are still waiting for AI review.`);
  }
  if (counts.filteredSpam7d > 0) {
    watchouts.push(`${counts.filteredSpam7d} pitches were filtered as spam this week.`);
  }
  return {
    headline,
    highlights: picked.map((candidate) => ({
      refType: candidate.refType,
      refId: candidate.refId,
      why: truncate(
        candidate.reason ??
          (candidate.summary
            ? `${candidate.summary}${candidate.fitScore !== null ? ` (fit ${candidate.fitScore})` : ''}`
            : `${candidate.title} stands out this week.`),
        LIMITS.briefing.whyMax,
      ),
    })),
    watchouts: watchouts.slice(0, LIMITS.briefing.watchoutsMax),
    model: FAKE_MODEL,
  };
}

// ---------------------------------------------------------------- promoteDrafts

function hashtagsFor(input: PromoteDraftsInput): string[] {
  const words = significant(`${input.post.title} ${input.post.communityName}`)
    .filter((word) => /^[a-z0-9]+$/.test(word))
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return [...new Set([...words, 'BuildInPublic'])].slice(0, LIMITS.promotion.hashtags.max);
}

function draftFor(platform: PromotionPlatform, input: PromoteDraftsInput): PromotionDraft {
  const { post, creatorName } = input;
  const summary = firstSentence(post.body);
  const roles = post.rolesNeeded.length > 0 ? `Looking for: ${post.rolesNeeded.join(', ')}.` : '';
  const team =
    input.team.length > 0
      ? `Built by ${input.team.map((m) => `${m.name} (${m.role})`).join(', ')}.`
      : '';
  const link = input.showcaseUrl ? input.showcaseUrl : '';
  const texts: Record<PromotionPlatform, string> = {
    x: [
      `${post.title} by ${post.authorName}, from my ${post.communityName} community.`,
      roles,
      link,
    ]
      .filter(Boolean)
      .join(' '),
    instagram: [
      `${post.title}`,
      '',
      summary,
      team,
      roles,
      '',
      `One of the best things to come out of the ${post.communityName} community. Link in bio.`,
    ]
      .filter((line, i, all) => line !== '' || (all[i - 1] ?? '') !== '')
      .join('\n'),
    linkedin: [
      `I want to spotlight ${post.title}, started by ${post.authorName} in my ${post.communityName} community.`,
      '',
      summary,
      team,
      roles,
      link,
      '',
      `- ${creatorName}`,
    ].join('\n'),
    youtube: [
      `${post.title} | Featured from the ${post.communityName} community`,
      '',
      post.body,
      '',
      team,
      roles,
      link,
    ].join('\n'),
  };
  return {
    text: truncate(texts[platform].replace(/\n{3,}/g, '\n\n'), LIMITS.promotion.text[platform]),
    hashtags: hashtagsFor(input),
  };
}

export function fakePromoteDrafts(input: PromoteDraftsInput): PromoteDraftsOutput {
  const platforms =
    input.platforms && input.platforms.length > 0 ? input.platforms : [...PROMOTION_PLATFORMS];
  const drafts: Partial<Record<PromotionPlatform, PromotionDraft>> = {};
  for (const platform of platforms) drafts[platform] = draftFor(platform, input);
  return {
    drafts,
    failed: [],
    headline: truncate(input.post.title, LIMITS.promotion.headline.max),
    model: FAKE_MODEL,
  };
}

// ---------------------------------------------------------------- P1

export function fakeCommunityDigest(input: CommunityDigestInput): CommunityDigestOutput {
  const top = [...input.posts].sort((a, b) => b.signals - a.signals).slice(0, 3);
  return {
    summary: truncate(
      `${input.posts.length} posts in ${input.communityName} this week${top[0] ? `, led by "${top[0].title}"` : ''}.`,
      280,
    ),
    themes: [...new Set(input.posts.flatMap((post) => significant(post.title)))].slice(0, 3),
    standouts: top.map((post) => ({
      refId: post.id,
      why: truncate(post.summary ?? post.title, 140),
    })),
    model: FAKE_MODEL,
  };
}

export function fakeSuggestReply(input: SuggestReplyInput): SuggestReplyOutput {
  const first = input.pitch.senderName.split(' ')[0] || 'there';
  return {
    reply: truncate(
      `Hi ${first}, thanks for reaching out about "${input.pitch.subject}". I'd love to hear more. - ${input.creatorName}`,
      LIMITS.pitch.reply.max,
    ),
    model: FAKE_MODEL,
  };
}

// ---------------------------------------------------------------- services

export function createFakeAiServices(options: FakeAiOptions = {}): AiServices {
  const aiRuns = options.accounting?.aiRuns;

  async function run<T>(
    task: AiTaskName,
    ctx: AiContext,
    input: unknown,
    produce: () => T,
  ): Promise<T> {
    const forced = options.failTasks?.[task];
    if (forced) throw new AiUnavailableError(forced, undefined, { task });

    if (aiRuns) {
      const budget = await aiRuns.budgetState(ctx.spaceId);
      if (budget.paused) throw new AiUnavailableError('budget', undefined, { task });
      if (task === 'suggestCommunities' && ctx.userId) {
        const used = await aiRuns.countByUserTaskSince(ctx.userId, task, hoursAgo(1));
        if (used >= HOURLY_CAPS.suggestCommunities)
          throw new AiUnavailableError('cap', undefined, { task });
      }
      if (task === 'promoteDrafts' || task === 'askAI') {
        const used = await aiRuns.countBySpaceTaskSince(ctx.spaceId, task, startOfUtcDay());
        if (used >= DAILY_CAPS[task]) throw new AiUnavailableError('cap', undefined, { task });
      }
    }

    const started = Date.now();
    const output = produce();
    if (aiRuns) {
      await aiRuns.insert({
        spaceId: ctx.spaceId,
        userId: ctx.userId ?? null,
        task,
        refType: ctx.refType ?? null,
        refId: ctx.refId && UUID.test(ctx.refId) ? ctx.refId : null,
        model: FAKE_MODEL,
        inputTokens: estimateTokens(input),
        outputTokens: task === 'embedItem' ? 0 : estimateTokens(output),
        latencyMs: Date.now() - started,
        status: 'ok',
      });
    }
    return output;
  }

  return {
    mode: 'fake',
    triageItem: (input, ctx) => run('triageItem', ctx, input, () => fakeTriage(input)),
    embedItem: (input: EmbedInput, ctx) =>
      run('embedItem', ctx, input, () => fakeEmbedding(`${input.title}\n${input.body}`)),
    suggestCommunities: (input, ctx) =>
      run('suggestCommunities', ctx, input, () => fakeSuggestCommunities(input)),
    briefing: (input, ctx) => run('briefing', ctx, input, () => fakeBriefing(input)),
    promoteDrafts: (input, ctx) => run('promoteDrafts', ctx, input, () => fakePromoteDrafts(input)),
    communityDigest: (input, ctx) =>
      run('communityDigest', ctx, input, () => fakeCommunityDigest(input)),
    suggestReply: (input, ctx) => run('suggestReply', ctx, input, () => fakeSuggestReply(input)),
  };
}

/** Narrowing helpers for AI categories (the analyzer validates triage output with these). */
export function isPostType(value: string): value is PostType {
  return (POST_TYPES as readonly string[]).includes(value);
}

export function isPitchType(value: string): value is PitchType {
  return (PITCH_TYPES as readonly string[]).includes(value);
}
