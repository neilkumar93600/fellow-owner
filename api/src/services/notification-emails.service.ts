import {
  EMAIL_NOTIFICATION_KINDS,
  type EmailNotificationKind,
  LIMITS,
  type NotificationPrefs,
  type NotificationPrefsInput,
} from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { signToken, verifyToken } from '../lib/signed-token.js';
import type { DigestRow } from '../repositories/notification-prefs.repo.js';
import type { NotificationPayloads } from './notifications.service.js';

export type NotificationEmailsServiceDeps = Pick<CoreDeps, 'env' | 'repos' | 'mailer' | 'logger'>;

const UNSUBSCRIBE_PURPOSE = 'email-unsubscribe';

/** Notifications younger than this are left for the next run: people reading live are not emailed. */
const SETTLE_MS = 10 * 60_000;

/** A first digest never mails further back than this. */
const LOOKBACK_MS = 7 * 86_400_000;

const seg = encodeURIComponent;

/** One digest line: text plus a site path, from the notification's payload (same wording as the bell). */
function describe(row: DigestRow): { text: string; href: string } {
  const space = `/${seg(row.spaceHandle)}`;
  const creator = row.spaceDisplayName;
  // ponytail: payload is trusted (only notify() writes it), cast instead of re-validating.
  switch (row.kind as EmailNotificationKind) {
    case 'reply_received': {
      const v = row.payload as unknown as NotificationPayloads['reply_received'];
      return {
        text: `${creator} replied to your idea: ${v.subject}`,
        href: `${space}/me?tab=pitches`,
      };
    }
    case 'project_featured': {
      const v = row.payload as unknown as NotificationPayloads['project_featured'];
      return {
        text: `${creator} featured your fan project: ${v.title}`,
        href: `${space}/p/${seg(v.postId)}`,
      };
    }
    case 'spotlighted':
      return { text: `${creator} gave you a shout-out in Fans of the week`, href: space };
    case 'challenge_shortlisted': {
      const v = row.payload as unknown as NotificationPayloads['challenge_shortlisted'];
      return {
        text: `Your entry made ${creator}'s shortlist: ${v.title}`,
        href: `${space}/p/${seg(v.postId)}`,
      };
    }
    case 'team_decision': {
      const v = row.payload as unknown as NotificationPayloads['team_decision'];
      return {
        text:
          v.status === 'accepted'
            ? `You're on the crew for ${v.title} as ${v.role}`
            : `Your request to join the crew for ${v.title} as ${v.role} was declined`,
        href: `${space}/p/${seg(v.postId)}`,
      };
    }
  }
}

/** Email channel for notifications: prefs, hourly digest, one-click unsubscribe. */
export function createNotificationEmailsService(deps: NotificationEmailsServiceDeps) {
  const { env, repos, mailer } = deps;
  const log = deps.logger.child({ module: 'notification-emails' });
  const repo = repos.notificationPrefs;

  async function getPrefs(userId: string): Promise<NotificationPrefs> {
    const row = await repo.get(userId);
    const unsubscribed = row?.unsubscribedAt != null;
    const kinds = Object.fromEntries(
      EMAIL_NOTIFICATION_KINDS.map((kind) => [kind, row?.kinds[kind] !== false]),
    ) as Record<EmailNotificationKind, boolean>;
    return { emailEnabled: (row?.emailEnabled ?? true) && !unsubscribed, kinds, unsubscribed };
  }

  async function sendDigest(userId: string, email: string, name: string, rows: DigestRow[]) {
    const unsubscribeUrl = `${env.WEB_ORIGIN}/api/email/unsubscribe?token=${encodeURIComponent(
      signToken(UNSUBSCRIBE_PURPOSE, userId, env.BETTER_AUTH_SECRET),
    )}`;
    const shown = rows.slice(0, LIMITS.emails.digestMaxItems);
    const lines = shown.map((row) => {
      const { text, href } = describe(row);
      return `- ${text}\n  ${env.WEB_ORIGIN}${href}`;
    });
    const more = rows.length - shown.length;
    const count = rows.length;
    // ponytail: plain text only, so a pitch or post title can never inject markup.
    const text = [
      `Hi ${name.split(' ')[0] || 'there'},`,
      '',
      `Here is what happened since we last wrote:`,
      '',
      ...lines,
      ...(more > 0 ? ['', `...and ${more} more. Open Fellow Owners to see everything.`] : []),
      '',
      `You get these emails because notification emails are on for your account.`,
      `Unsubscribe in one click: ${unsubscribeUrl}`,
      `Or choose which emails you get: ${env.WEB_ORIGIN}/email-preferences`,
    ].join('\n');
    await mailer.send({
      to: email,
      subject:
        count === 1 ? '1 new update on Fellow Owners' : `${count} new updates on Fellow Owners`,
      text,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
  }

  return {
    getPrefs,

    async updatePrefs(userId: string, input: NotificationPrefsInput): Promise<NotificationPrefs> {
      // Only the kinds the user switched off are stored; absent means on.
      const kinds = Object.fromEntries(
        Object.entries(input.kinds).filter(([, on]) => on === false),
      ) as Partial<Record<EmailNotificationKind, boolean>>;
      await repo.upsert(userId, { emailEnabled: input.emailEnabled, kinds });
      return getPrefs(userId);
    },

    /** A signed `email-unsubscribe` token -> unsubscribed; false for a bad token or a gone user. */
    async unsubscribe(token: string): Promise<boolean> {
      const userId = verifyToken(UNSUBSCRIBE_PURPOSE, token, env.BETTER_AUTH_SECRET);
      if (!userId) return false;
      return repo.markUnsubscribed(userId, new Date());
    },

    /**
     * The hourly digest job (tick `email_digests`): one email per user with their due unread
     * notifications. The watermark moves to the settle cutoff (not `now`), so a notification that
     * was too young to send is still picked up by the next run. A failed send keeps the watermark
     * and is retried next run. Resolves with the emails sent.
     */
    async sendDue(now: Date): Promise<number> {
      const olderThan = new Date(now.getTime() - SETTLE_MS);
      const rows = await repo.dueDigestRows({
        kinds: EMAIL_NOTIFICATION_KINDS,
        olderThan,
        since: new Date(now.getTime() - LOOKBACK_MS),
      });
      const byUser = new Map<string, DigestRow[]>();
      for (const row of rows) byUser.set(row.userId, [...(byUser.get(row.userId) ?? []), row]);

      let sent = 0;
      for (const [userId, userRows] of byUser) {
        const first = userRows[0] as DigestRow;
        try {
          await sendDigest(userId, first.email, first.name, userRows);
          await repo.setLastDigestAt(userId, olderThan);
          sent += 1;
        } catch (error) {
          log.error({ err: error, userId }, 'digest email failed; retried on the next run');
        }
      }
      if (sent > 0) log.info({ sent }, 'notification digests sent');
      return sent;
    },
  };
}

export type NotificationEmailsService = ReturnType<typeof createNotificationEmailsService>;
