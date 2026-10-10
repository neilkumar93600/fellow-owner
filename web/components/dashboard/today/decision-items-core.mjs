// Pure Today logic, shared by decision-items.ts and its node check (decision-items.check.mjs).
import { PITCH_TYPE_LABELS } from '@fellow-owners/shared';

/** @typedef {import('./decision-items').DecisionItem} DecisionItem */
/** @typedef {import('@fellow-owners/shared').BriefingHighlight} BriefingHighlight */
/** @typedef {import('@fellow-owners/shared').InboxItem} InboxItem */
/** @typedef {import('@fellow-owners/shared').IdeaItem} IdeaItem */

/** @type {Record<string, 'pitch' | 'post' | 'fan'>} */
const KIND = { inbound: 'pitch', post: 'post', membership: 'fan' };

// ponytail: same paths as routes.dashboard.inbox/ideas({ item }); the briefing API sends these too.
const pitchHref = (/** @type {string} */ id) => `/dashboard/inbox?item=${encodeURIComponent(id)}`;
const postHref = (/** @type {string} */ id) => `/dashboard/ideas?item=${encodeURIComponent(id)}`;

/** @param {InboxItem} pitch */
function pitchLabel(pitch) {
  // Filed as the inbox files it: the AI's category once analyzed, else the type the fan picked.
  const type = (pitch.ai.status === 'done' && pitch.ai.category) || pitch.type;
  return (
    PITCH_TYPE_LABELS[/** @type {keyof typeof PITCH_TYPE_LABELS} */ (type)] ??
    PITCH_TYPE_LABELS[pitch.type]
  );
}

/** @param {InboxItem} pitch @returns {DecisionItem} */
function fromPitch(pitch) {
  return {
    id: `pitch:${pitch.id}`,
    kind: 'pitch',
    refId: pitch.id,
    name: pitch.sender.name,
    avatarUrl: pitch.sender.image,
    context: pitchLabel(pitch),
    title: pitch.subject,
    quote: pitch.excerpt || pitch.ai.summary || pitch.subject,
    reason: pitch.ai.fitReason,
    score: pitch.ai.fitScore,
    lovedAt: null,
    href: pitchHref(pitch.id),
  };
}

/** @param {IdeaItem} post @returns {DecisionItem} */
function fromPost(post) {
  return {
    id: `post:${post.id}`,
    kind: 'post',
    refId: post.id,
    name: post.author.name,
    avatarUrl: post.author.image,
    context: post.community.name,
    title: post.title,
    quote: post.excerpt || post.ai.summary || post.title,
    reason: post.ai.fitReason,
    score: post.ai.fitScore,
    lovedAt: post.lovedAt ?? null,
    href: postHref(post.id),
  };
}

/**
 * The Today stack: the briefing's picks first (in its order), then waiting pitches by match, then ideas
 * by signals. One card per item; spam-filtered pitches and hidden ideas never make it. A pick borrows
 * the face, room and words of its row when that row was fetched too.
 * @param {{ briefing: BriefingHighlight[]; pitches: InboxItem[]; posts: IdeaItem[]; limit?: number }} input
 * @returns {DecisionItem[]}
 */
export function buildDecisionItems({ briefing, pitches, posts, limit = 5 }) {
  const livePitches = pitches.filter((p) => !p.isFiltered);
  const livePosts = posts.filter((p) => !p.hidden);
  const pitchById = new Map(livePitches.map((p) => [p.id, p]));
  const postById = new Map(livePosts.map((p) => [p.id, p]));

  /** @type {DecisionItem[]} */
  const picks = briefing.map((h) => {
    const kind = KIND[h.refType] ?? 'post';
    const pitch = kind === 'pitch' ? pitchById.get(h.refId) : undefined;
    const post = kind === 'post' ? postById.get(h.refId) : undefined;
    const row = pitch ? fromPitch(pitch) : post ? fromPost(post) : null;
    return {
      id: `${kind}:${h.refId}`,
      kind,
      refId: h.refId,
      // A fan pick's title is the fan's name; any other pick whose row was not fetched stays anonymous.
      name: row?.name ?? (kind === 'fan' ? h.title : 'A fan'),
      avatarUrl: row?.avatarUrl ?? null,
      context: row?.context ?? (kind === 'fan' ? 'Rising fan' : 'Your briefing'),
      title: row?.title ?? h.title,
      quote: row?.quote ?? h.title,
      reason: h.why || row?.reason || null,
      score: h.fitScore ?? row?.score ?? null,
      lovedAt: row?.lovedAt ?? null,
      href: h.href,
    };
  });

  const byScore = [...livePitches].sort((a, b) => (b.ai.fitScore ?? -1) - (a.ai.fitScore ?? -1));
  const bySignals = [...livePosts].sort(
    (a, b) => b.useCount + b.buildCount - (a.useCount + a.buildCount),
  );

  const seen = new Set();
  /** @type {DecisionItem[]} */
  const out = [];
  for (const item of [...picks, ...byScore.map(fromPitch), ...bySignals.map(fromPost)]) {
    if (out.length >= limit) break;
    if (seen.has(item.refId)) continue;
    seen.add(item.refId);
    out.push(item);
  }
  return out;
}

/**
 * About 1.2 minutes a card, never under one.
 * @param {number} count
 */
export function estimateMinutes(count) {
  return Math.max(1, Math.round(count * 1.2));
}

/**
 * The pulse line: the community with the most new ideas this week, or null when none had any.
 * @param {Array<{ name: string; posts: number }>} communities
 * @returns {string | null}
 */
export function pulseSentence(communities) {
  const top = communities.reduce(
    (best, c) => (c.posts > (best?.posts ?? 0) ? c : best),
    /** @type {{ name: string; posts: number } | null} */ (null),
  );
  if (!top) return null;
  return `${top.name} was your busiest community this week: ${top.posts} new ${top.posts === 1 ? 'idea' : 'ideas'}.`;
}
