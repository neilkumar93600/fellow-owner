import {
  type markNotificationsReadSchema,
  type NotificationItem,
  type NotificationKind,
  type NotificationsPage,
  type NotificationsQuery,
  PITCH_TYPE_LABELS,
  type PitchType,
  POST_TYPE_LABELS,
  type PostType,
  REPORT_REASON_LABELS,
  type ReportReason,
  type ReportTarget,
  type UnreadCount,
} from '@fellow-owners/shared';
import type { z } from 'zod';
import type { Db } from '../db/client.js';
import { toIso, toIsoOrNull } from '../lib/dates.js';
import type { Logger } from '../lib/logger.js';
import { clampLimit, decodeTimeCursor, encodeTimeCursor, toPage } from '../lib/pagination.js';
import { displayName } from '../lib/present.js';
import type { PubSub } from '../lib/pubsub.js';
import type { Repos } from '../repositories/index.js';
import type { NotificationWithSpace } from '../repositories/notifications.repo.js';

export type MarkNotificationsReadBody = z.output<typeof markNotificationsReadSchema>;

/**
 * What each kind stores in notifications.payload. Names and titles are snapshots taken when the
 * notification is created; text and href are rendered from them at read time.
 */
export interface NotificationPayloads {
  /** To the space owner when a member publishes a post (any type). */
  idea_posted: {
    postId: string;
    title: string;
    postType: PostType;
    actorName: string;
    communityName: string;
  };
  /** To the space owner when a member sends a pitch. */
  pitch_received: { inboundId: string; subject: string; pitchType: PitchType; actorName: string };
  /** To the pitch sender when the owner replies (questionGroupId: an Answer Once reply, F32). */
  reply_received: { inboundId: string; subject: string; questionGroupId?: string };
  /** To the post author when the owner publishes a promotion of their post. */
  project_featured: { postId: string; title: string };
  /** To the project lead (post author) when someone requests a role. */
  team_request: { postId: string; title: string; actorName: string; role: string };
  /** To the requester when the lead accepts or declines. */
  team_decision: { postId: string; title: string; role: string; status: 'accepted' | 'declined' };
  /** To the post author when someone else comments. */
  comment_received: { postId: string; title: string; actorName: string; commentId: string };
  /** To members of the target community (or all members) when the owner opens a challenge. */
  ask_posted: { askId: string; title: string; communityName: string | null };
  /** To the post author when the owner loves their post. */
  post_loved: { postId: string; title: string };
  /** To the fan when the owner approves a spotlight shout-out. */
  spotlighted: { note: string };
  /** To each author on a closed challenge's shortlist. */
  challenge_shortlisted: { askId: string; postId: string; title: string };
  /** To the space owner when a member reports a post or comment (F25). */
  report_filed: { reportId: string; targetType: ReportTarget; reason: ReportReason };
}

/** notify() input, discriminated by kind. */
export type NotifyInput = {
  [K in NotificationKind]: {
    /** Recipient (user.id). Callers skip the call when the recipient is the actor. */
    userId: string;
    spaceId: string;
    kind: K;
    payload: NotificationPayloads[K];
  };
}[NotificationKind];

export interface NotificationsServiceDeps {
  db: Db;
  repos: Repos;
  logger: Logger;
  pubsub: PubSub;
}

/** Titles and subjects in notification text are cut to about this many characters. */
const TITLE_MAX = 80;

/** A watched unread count is recounted at most this often (bursts of changes coalesce). */
const RECOUNT_MS = 250;

/** Cuts by code point so an emoji is never split into a lone surrogate. */
function cut(text: string): string {
  const chars = Array.from(text.trim());
  if (chars.length <= TITLE_MAX) return chars.join('');
  const head = chars.slice(0, TITLE_MAX - 1).join('');
  return `${head.trimEnd()}…`;
}

const seg = encodeURIComponent;

/** "a collab pitch", "an idea pitch", "a pitch" (other). */
function pitchPhrase(type: PitchType): string {
  if (type === 'other') return 'a pitch';
  const label = PITCH_TYPE_LABELS[type].toLowerCase();
  return `${/^[aeiou]/.test(label) ? 'an' : 'a'} ${label} pitch`;
}

/** Text + href for one row, from kind + payload + space (web/lib/routes.ts paths). */
function present(row: NotificationWithSpace): Pick<NotificationItem, 'text' | 'href'> {
  const space = `/${seg(row.spaceHandle)}`;
  const creator = row.spaceDisplayName;
  // ponytail: payload is trusted (only notify() writes it), cast instead of re-validating.
  const p = row.payload as never;
  switch (row.kind) {
    case 'idea_posted': {
      const v: NotificationPayloads['idea_posted'] = p;
      return {
        text: `${v.actorName} posted a new ${(POST_TYPE_LABELS[v.postType] ?? v.postType).toLowerCase()} in ${v.communityName}: ${cut(v.title)}`,
        href: `/dashboard/ideas?item=${seg(v.postId)}`,
      };
    }
    case 'pitch_received': {
      const v: NotificationPayloads['pitch_received'] = p;
      return {
        text: `${v.actorName} sent you ${pitchPhrase(v.pitchType)}: ${cut(v.subject)}`,
        href: `/dashboard/inbox?item=${seg(v.inboundId)}`,
      };
    }
    case 'reply_received': {
      const v: NotificationPayloads['reply_received'] = p;
      return {
        text: `${creator} replied to your idea: ${cut(v.subject)}`,
        href: `${space}/me?tab=pitches`,
      };
    }
    case 'project_featured': {
      const v: NotificationPayloads['project_featured'] = p;
      return {
        text: `${creator} featured your fan project: ${cut(v.title)}`,
        href: `${space}/p/${seg(v.postId)}`,
      };
    }
    case 'team_request': {
      const v: NotificationPayloads['team_request'] = p;
      return {
        text: `${v.actorName} asked to join ${cut(v.title)} as ${v.role}`,
        href: `${space}/p/${seg(v.postId)}`,
      };
    }
    case 'team_decision': {
      const v: NotificationPayloads['team_decision'] = p;
      return {
        text:
          v.status === 'accepted'
            ? `You're on the crew for ${cut(v.title)} as ${v.role}`
            : `Your request to join the crew for ${cut(v.title)} as ${v.role} was declined`,
        href: `${space}/p/${seg(v.postId)}`,
      };
    }
    case 'comment_received': {
      const v: NotificationPayloads['comment_received'] = p;
      return {
        text: `${v.actorName} commented on ${cut(v.title)}`,
        href: `${space}/p/${seg(v.postId)}`,
      };
    }
    case 'ask_posted': {
      const v: NotificationPayloads['ask_posted'] = p;
      return {
        text: `${creator} started a challenge${v.communityName ? ` in ${v.communityName}` : ''}: ${cut(v.title)}`,
        href: space,
      };
    }
    case 'post_loved': {
      const v: NotificationPayloads['post_loved'] = p;
      return {
        text: `${creator} loved your idea: ${cut(v.title)}`,
        href: `${space}/p/${seg(v.postId)}`,
      };
    }
    case 'spotlighted':
      return { text: `${creator} gave you a shout-out in Fans of the week`, href: space };
    case 'challenge_shortlisted': {
      const v: NotificationPayloads['challenge_shortlisted'] = p;
      return {
        text: `Your entry made ${creator}'s shortlist: ${cut(v.title)}`,
        href: `${space}/p/${seg(v.postId)}`,
      };
    }
    case 'report_filed': {
      const v: NotificationPayloads['report_filed'] = p;
      return {
        text: `A ${v.targetType} was reported: ${REPORT_REASON_LABELS[v.reason] ?? v.reason}`,
        href: '/dashboard/communities/reports',
      };
    }
    default:
      return { text: `New activity in ${creator}'s space`, href: space };
  }
}

/**
 * In-app notifications (F21). Other services call notify() after their transaction commits;
 * it never throws (failures are logged), so a notification can never fail the action itself.
 * The bell reads list / unreadCount / markRead for the signed-in user, and watchUnread for its
 * live count: notify() and markRead() publish each change on the pub/sub (lib/pubsub.ts).
 */
export function createNotificationsService(deps: NotificationsServiceDeps) {
  const { repos, pubsub } = deps;
  const log = deps.logger.child({ module: 'notifications' });

  /** Tells the open streams (in every API process) that the user's notifications changed. Never throws. */
  async function changed(userId: string, spaceId: string | null): Promise<void> {
    try {
      await pubsub.publish({ userId, spaceId });
    } catch (error) {
      log.error({ err: error, spaceId }, 'notification publish failed');
    }
  }

  /** undefined = no filter; null = unknown handle (empty results). */
  async function spaceFilter(handle: string | undefined): Promise<string | null | undefined> {
    if (!handle) return undefined;
    return (await repos.spaces.findByHandle(handle))?.id ?? null;
  }

  return {
    /**
     * Recipient id and display-name snapshot of a membership; userId null when gone or removed
     * (a removed member hears nothing more from the space). Never throws.
     */
    async member(membershipId: string | null): Promise<{ userId: string | null; name: string }> {
      if (!membershipId) return { userId: null, name: displayName(null) };
      try {
        const ref = (await repos.memberships.refs([membershipId])).get(membershipId);
        return {
          userId: ref?.removed ? null : (ref?.userId ?? null),
          name: displayName(ref?.name),
        };
      } catch (error) {
        log.error({ err: error, membershipId }, 'notification member lookup failed');
        return { userId: null, name: displayName(null) };
      }
    },

    /** Stores one notification and announces it. Never throws. */
    async notify(input: NotifyInput): Promise<void> {
      try {
        await repos.notifications.insert({
          userId: input.userId,
          spaceId: input.spaceId,
          kind: input.kind,
          payload: input.payload,
        });
      } catch (error) {
        log.error(
          { err: error, kind: input.kind, spaceId: input.spaceId },
          'notification insert failed',
        );
        return;
      }
      await changed(input.userId, input.spaceId);
    },

    /** GET /api/notifications: newest first; `space` (a handle) narrows to one space. */
    async list(userId: string, query: NotificationsQuery): Promise<NotificationsPage> {
      const spaceId = await spaceFilter(query.space);
      if (spaceId === null) return { items: [], nextCursor: null, unread: 0 };
      const limit = clampLimit(query.limit);
      const rows = await repos.notifications.list(userId, {
        ...(spaceId ? { spaceId } : {}),
        cursor: decodeTimeCursor(query.cursor),
        limit: limit + 1,
      });
      const page = toPage(rows, limit, encodeTimeCursor);
      return {
        items: page.items.map((row) => ({
          id: row.id,
          kind: row.kind,
          ...present(row),
          spaceHandle: row.spaceHandle,
          readAt: toIsoOrNull(row.readAt),
          createdAt: toIso(row.createdAt),
        })),
        nextCursor: page.nextCursor,
        unread: await repos.notifications.countUnread(userId, spaceId),
      };
    },

    /** GET /api/notifications/unread */
    async unreadCount(userId: string, spaceHandle?: string): Promise<UnreadCount> {
      const spaceId = await spaceFilter(spaceHandle);
      if (spaceId === null) return { unread: 0 };
      return { unread: await repos.notifications.countUnread(userId, spaceId) };
    },

    /** POST /api/notifications/read: the given ids, or all (within `space` when given). */
    async markRead(userId: string, input: MarkNotificationsReadBody): Promise<UnreadCount> {
      const spaceId = await spaceFilter(input.space);
      if (spaceId === null) return { unread: 0 };
      const marked = await repos.notifications.markRead(userId, {
        ...(input.ids ? { ids: input.ids } : {}),
        ...(spaceId ? { spaceId } : {}),
      });
      // The user's other tabs update too. Ids alone may span spaces: no space then.
      if (marked > 0) await changed(userId, spaceId ?? null);
      return { unread: await repos.notifications.countUnread(userId, spaceId) };
    },

    /**
     * The bell's live count (GET /api/notifications/stream): sends the unread count now, then again
     * after each change to this user's notifications (in `spaceHandle` when given), recounting at
     * most once per RECOUNT_MS. Resolves after the first send with the stop function.
     */
    async watchUnread(
      userId: string,
      spaceHandle: string | undefined,
      send: (count: UnreadCount) => void,
    ): Promise<() => void> {
      const spaceId = await spaceFilter(spaceHandle);
      if (spaceId === null) {
        send({ unread: 0 });
        return () => {};
      }
      let stopped = false;
      let timer: NodeJS.Timeout | undefined;
      const count = async () => {
        const unread = await repos.notifications.countUnread(userId, spaceId);
        if (!stopped) send({ unread });
      };
      // Subscribed before the first count, so no change slips in between.
      let counting = Promise.resolve();
      const unsubscribe = pubsub.subscribe((event) => {
        if (event.userId !== userId || timer) return;
        if (spaceId && event.spaceId && event.spaceId !== spaceId) return;
        timer = setTimeout(() => {
          timer = undefined;
          // Chained: one query at a time, so counts go out in order.
          counting = counting
            .then(count)
            .catch((error: unknown) => log.error({ err: error }, 'live unread recount failed'));
        }, RECOUNT_MS);
      });
      const stop = () => {
        stopped = true;
        clearTimeout(timer);
        unsubscribe();
      };
      counting = count();
      try {
        await counting;
      } catch (error) {
        stop();
        throw error;
      }
      return stop;
    },

    /** False while live delivery is down (Redis unreachable): streams then fall back to polling. */
    isLive(): boolean {
      return pubsub.ready;
    },
  };
}

export type NotificationsService = ReturnType<typeof createNotificationsService>;
