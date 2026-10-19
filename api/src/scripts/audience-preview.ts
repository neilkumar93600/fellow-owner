import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { LIMITS } from '@fellow-owners/shared';
import pino from 'pino';
import { createAiModels } from '../ai/provider.js';
import type { AiAccounting, AiRuntime } from '../ai/run.js';
import { clusterImport } from '../ai/tasks/cluster-import.js';
import { tagFollowers } from '../ai/tasks/tag-followers.js';
import {
  type ClusterImportInput,
  type ClusterImportOutput,
  TAG_FOLLOWERS_BATCH,
  type TagFollowersInput,
  type TagFollowersOutput,
} from '../ai/types.js';
import {
  type ChannelRef,
  createYoutubeClient,
  parseChannelUrl,
  type YoutubeComments,
  YoutubeError,
} from '../lib/youtube.js';
import { buildPreviewHtml, type PreviewRoom, scrubComment } from './audience-preview-html.js';

/**
 * Audience preview (pilot first touch): a creator's public YouTube comments -> suggested rooms ->
 * one self-contained HTML card the founder screenshots for a first DM. Local only: no database, no
 * hosting. Only aggregates and scrubbed quotes leave this process; raw comments and commenter
 * names stay in memory and are never written, logged or put in the HTML.
 *
 *   pnpm --filter @fellow-owners/api preview:audience -- --channel @name --out preview.html
 */

export class PreviewAbort extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PreviewAbort';
  }
}

const COMMENT_JOIN = ' | '; // lib/youtube.ts joins one commenter's comments with this.
const VALID_DAYS = 7;
const UNNAMED_FAN = 'fan';

/** Throws PreviewAbort unless the comments are real, from at least one video, and not empty. */
export function assertUsable(comments: YoutubeComments): void {
  if (comments.source === 'sample') {
    throw new PreviewAbort(
      'YouTube returned sample data (no live YOUTUBE_API_KEY), so the preview would be made up.',
    );
  }
  if (comments.videos === 0) {
    throw new PreviewAbort('This channel has no public videos to read.');
  }
  if (comments.commenters.length === 0) {
    throw new PreviewAbort(
      'No public comments were found on the latest videos (comments may be turned off).',
    );
  }
}

export interface PreviewDeps {
  commenters(channel: ChannelRef): Promise<YoutubeComments>;
  cluster(input: ClusterImportInput): Promise<ClusterImportOutput>;
  tag(input: TagFollowersInput): Promise<TagFollowersOutput>;
  now?: () => Date;
}

const YOUTUBE_MESSAGES = {
  not_found: 'YouTube could not find that channel. Check the handle or link.',
  quota: 'The YouTube API quota is used up for today. Try again tomorrow.',
  unavailable: 'YouTube did not answer. Try again in a few minutes.',
} as const;

function channelRefOf(arg: string): ChannelRef {
  const url = arg.startsWith('@') ? `https://www.youtube.com/${arg}` : arg;
  const ref = parseChannelUrl(url);
  if (!ref) {
    throw new PreviewAbort('Use a YouTube channel like @name or youtube.com/@name.');
  }
  return ref;
}

/** Runs the whole preview and returns the HTML; writes nothing and throws PreviewAbort on bad input. */
export async function buildPreview(
  channelArg: string,
  deps: PreviewDeps,
): Promise<{ html: string; summary: string }> {
  const channel = channelRefOf(channelArg);
  const channelTitle = 'handle' in channel ? channel.handle : 'Your channel';

  let fetched: YoutubeComments;
  try {
    fetched = await deps.commenters(channel);
  } catch (error) {
    if (error instanceof YoutubeError) throw new PreviewAbort(YOUTUBE_MESSAGES[error.reason]);
    throw error;
  }
  assertUsable(fetched);

  // Names and handles are only used to strip them from quotes.
  const identities = fetched.commenters.flatMap((c) => [c.name, c.handle]);
  const texts = fetched.commenters
    .flatMap((c) => c.note.split(COMMENT_JOIN))
    .map((text) => text.trim())
    .filter(Boolean);

  let clustered: ClusterImportOutput;
  try {
    clustered = await deps.cluster({
      creatorName: channelTitle,
      comments: texts,
      existingCommunities: [],
    });
  } catch {
    throw new PreviewAbort('The AI could not group the comments. Check the AI key and try again.');
  }
  if (clustered.communities.length === 0) {
    throw new PreviewAbort('The comments did not form any clear rooms.');
  }

  // clusterImport gives no sizes, so count by tagging every comment into the suggested rooms.
  const communities = clustered.communities.map((c, index) => ({
    id: `r${index}`,
    slug: `r${index}`,
    name: c.name,
    description: c.description,
  }));
  const counts = new Map<string, number>();
  try {
    for (let start = 0; start < texts.length; start += TAG_FOLLOWERS_BATCH) {
      const batch = texts.slice(start, start + TAG_FOLLOWERS_BATCH);
      const tagged = await deps.tag({
        communities,
        followers: batch.map((note, index) => ({
          id: String(start + index),
          name: UNNAMED_FAN,
          note,
        })),
      });
      for (const { communityIds } of tagged.tags) {
        for (const id of communityIds) counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  } catch {
    throw new PreviewAbort('The AI could not size the rooms. Try again.');
  }

  const rooms: PreviewRoom[] = clustered.communities
    .map((c, index) => ({
      // The model can echo a commenter into a room's name or description too.
      name: scrubComment(c.name, identities),
      description: scrubComment(c.description, identities),
      count: counts.get(`r${index}`) ?? 0,
      quotes: c.sampleQuotes
        .map((quote) => scrubComment(quote, identities))
        .filter((quote) => quote.length >= 12),
    }))
    .filter((room) => room.count > 0 && room.name.length > 0)
    .sort((a, b) => b.count - a.count);
  if (rooms.length === 0) throw new PreviewAbort('No comment fit any suggested room.');

  const generatedAt = deps.now?.() ?? new Date();
  const html = buildPreviewHtml({
    channelTitle,
    videoCount: fetched.videos,
    commentCount: texts.length,
    rooms,
    generatedAt,
    expiresAt: new Date(generatedAt.getTime() + VALID_DAYS * 24 * 60 * 60 * 1000),
  });
  return {
    html,
    summary: `${rooms.length} rooms from ${texts.length} comments on ${fetched.videos} videos`,
  };
}

/** No database here: space-less AI calls (spaceId null) never touch accounting. */
const noDatabase = async (): Promise<never> => {
  throw new Error('audience-preview has no database');
};
// A proxy, so the stub keeps working when AiAccounting grows a method.
const noAccounting = new Proxy({}, { get: () => noDatabase }) as AiAccounting;

async function main(): Promise<void> {
  // pnpm forwards the "--" that separates script args; parseArgs would treat the rest as positional.
  const argv = process.argv.slice(2).filter((arg, index) => !(index === 0 && arg === '--'));
  const { values } = parseArgs({
    args: argv,
    options: { channel: { type: 'string' }, out: { type: 'string' } },
  });
  if (!values.channel) {
    throw new PreviewAbort(
      'Usage: preview:audience -- --channel <@handle|channel URL> --out <file.html>',
    );
  }
  const outPath = resolve(values.out ?? 'audience-preview.html');

  // Imported late so a bad environment is reported as a message, not a stack trace on import.
  const { env } = await import('../config/env.js');
  if (!env.YOUTUBE_API_KEY) throw new PreviewAbort('Set YOUTUBE_API_KEY (YouTube Data API v3).');
  if (!env.AI_ENABLED || !env.OPENROUTER_API_KEY) {
    throw new PreviewAbort('Set OPENROUTER_API_KEY so the live AI can group the comments.');
  }

  const youtube = createYoutubeClient({ apiKey: env.YOUTUBE_API_KEY });
  const rt: AiRuntime = {
    enabled: true,
    models: createAiModels(env),
    accounting: noAccounting,
    logger: pino({ level: 'silent' }),
  };
  const ctx = { spaceId: null };

  const { html, summary } = await buildPreview(values.channel, {
    commenters: (channel) => youtube.commenters(channel, LIMITS.youtube),
    cluster: (input) => clusterImport(rt, input, ctx),
    tag: (input) => tagFollowers(rt, input, ctx),
  });
  writeFileSync(outPath, html, 'utf8');
  console.log(`Wrote ${outPath} (${summary}). Not published; send only a screenshot.`);
}

const isEntry = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isEntry) {
  main().catch((error: unknown) => {
    if (error instanceof PreviewAbort) console.error(`Preview stopped: ${error.message}`);
    else
      console.error(`Preview failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    process.exit(1);
  });
}
