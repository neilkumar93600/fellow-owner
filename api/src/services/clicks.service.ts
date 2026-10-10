import type { ClickPlatform } from '@fellow-owners/shared';
import type { Env } from '../config/env.js';
import { utcDayString } from '../lib/dates.js';
import { visitorHash } from '../lib/hash.js';
import type { Logger } from '../lib/logger.js';
import { isShortCode } from '../lib/short-code.js';
import type { Repos } from '../repositories/index.js';
import { promotionState } from '../repositories/promotions.repo.js';

export interface ClickRequest {
  code: string;
  platform: ClickPlatform;
  /** req.ip (trust proxy is on); hashed, never stored. */
  ip: string | null | undefined;
  userAgent: string | null | undefined;
  referer: string | null | undefined;
}

/**
 * Link-preview crawlers (X, Slack, LinkedIn, WhatsApp, ...) fetch a short link when it is posted.
 * They still get the redirect but are not counted as clicks.
 */
const BOT_USER_AGENT =
  /bot\b|crawler|spider|preview|facebookexternalhit|slackbot|twitterbot|linkedinbot|discordbot|whatsapp|telegrambot|embedly|quora link|skypeuripreview|vkshare|pinterest|redditbot|applebot|googlebot|bingbot|headless/i;

export function isBot(userAgent: string | null | undefined): boolean {
  return !userAgent || BOT_USER_AGENT.test(userAgent);
}

/** Host of the Referer header, never the path (05 click_events.referrer_host). */
export function referrerHost(referer: string | null | undefined): string | null {
  if (!referer) return null;
  try {
    const host = new URL(referer).host.toLowerCase();
    return host ? host.slice(0, 255) : null;
  } catch {
    return null;
  }
}

/**
 * GET /r/:code (02-trd data flow 5): records a click for a live promotion (platform from ?p=,
 * referrer host, visitor_hash = sha256(ip + ua + UTC day + CLICK_SALT); the raw IP is never stored)
 * and returns where to redirect: the showcase on the web origin. Unpublished promotions still
 * redirect to their showcase ("No longer featured") without counting; unknown codes go to "/".
 * Recording never blocks the redirect: failures are logged.
 */
export function createClicksService(deps: { env: Env; repos: Repos; logger: Logger }) {
  const { repos } = deps;
  const log = deps.logger.child({ module: 'clicks' });
  const webOrigin = deps.env.WEB_ORIGIN.replace(/\/+$/, '');

  return {
    async resolve(click: ClickRequest): Promise<string> {
      const home = `${webOrigin}/`;
      if (!isShortCode(click.code)) return home;
      const found = await repos.promotions.findByShortCode(click.code);
      if (!found) return home;
      const { promotion, handle } = found;
      const target = promotion.showcaseSlug
        ? `${webOrigin}/${encodeURIComponent(handle)}/s/${encodeURIComponent(promotion.showcaseSlug)}`
        : `${webOrigin}/${encodeURIComponent(handle)}`;

      if (promotionState(promotion) === 'live' && !isBot(click.userAgent)) {
        try {
          await repos.clicks.record({
            promotionId: promotion.id,
            platform: click.platform,
            referrerHost: referrerHost(click.referer),
            visitorHash: visitorHash(
              click.ip ?? '',
              click.userAgent ?? '',
              utcDayString(),
              deps.env.CLICK_SALT,
            ),
          });
        } catch (error) {
          log.error({ err: error, promotionId: promotion.id }, 'recording a click failed');
        }
      }
      return target;
    },
  };
}

export type ClicksService = ReturnType<typeof createClicksService>;
