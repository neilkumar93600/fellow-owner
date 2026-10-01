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

export interface AuthRequest {
  returnTo: string | null;
  inAppBrowser: boolean;
  /** Set when Better Auth sent the visitor back from Google with ?error=. */
  oauthError: boolean;
}

export async function readAuthRequest(searchParams: SearchParams): Promise<AuthRequest> {
  const [params, requestHeaders] = await Promise.all([searchParams, headers()]);
  const userAgent = requestHeaders.get('user-agent') ?? '';
  return {
    returnTo: safeReturnTo(params.returnTo),
    inAppBrowser: IN_APP_BROWSER.test(userAgent),
    oauthError: typeof params.error === 'string' && params.error.length > 0,
  };
}
