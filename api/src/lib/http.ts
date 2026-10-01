import type { RequestHandler, Response } from 'express';

/** Public pages cached by the CDN (bio page, showcase): 60 s, then stale for 5 minutes. */
export const PUBLIC_CACHE = 'public, s-maxage=60, stale-while-revalidate=300';

/** Session-dependent responses: never stored by the CDN or the browser. */
export const PRIVATE_NO_STORE = 'private, no-store';

export function setPublicCache(res: Response): Response {
  return res.set('Cache-Control', PUBLIC_CACHE);
}

/** Router-level: marks every response of the router as private (signed-in data). */
export function noStore(): RequestHandler {
  return (_req, res, next) => {
    res.set('Cache-Control', PRIVATE_NO_STORE);
    next();
  };
}
