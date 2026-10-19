/** The host fans see in the bio link. Its own module, so the landing's handle check skips onboarding's zod schemas. */
export const HOST = (() => {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (url && !url.includes('localhost')) {
    try {
      return new URL(url).host;
    } catch {
      // fall through
    }
  }
  return 'fellowowners.app';
})();
