import { headers } from 'next/headers';
import { safeReturnTo } from './auth-return-to';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Mirrors isInAppBrowser in hooks/use-in-app-browser.ts (a client module, so it cannot run here).
 * Checking the user agent on the server means the Google button never flashes inside Instagram,
 * TikTok or YouTube webviews, where most fans arrive and where Google blocks OAuth.
 */
const IN_APP_BROWSER =
  /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Bytedance|BytedanceWebview|Snapchat|LinkedInApp|Twitter|\bYouTube\b|GSA\/|Line\//i;

export const SOCIAL_PROVIDERS = ['google', 'apple', 'facebook'] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export interface OAuthError {
  /** Better Auth's `?error=` code, such as account_not_linked or access_denied. */
  code: string;
  /** From `?via=`, which SocialButtons adds to its error callback so the alert can name the provider. */
  provider: SocialProvider | null;
}

export interface AuthRequest {
  returnTo: string | null;
  inAppBrowser: boolean;
  /** Set when Better Auth sent the visitor back from Google, Apple or Facebook with ?error=. */
  oauthError: OAuthError | null;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function readAuthRequest(searchParams: SearchParams): Promise<AuthRequest> {
  const [params, requestHeaders] = await Promise.all([searchParams, headers()]);
  const userAgent = requestHeaders.get('user-agent') ?? '';
  const code = first(params.error);
  const via = first(params.via);
  return {
    returnTo: safeReturnTo(params.returnTo),
    inAppBrowser: IN_APP_BROWSER.test(userAgent),
    oauthError:
      code && code.length <= 64
        ? {
            code,
            provider: SOCIAL_PROVIDERS.find((p) => p === via) ?? null,
          }
        : null,
  };
}
