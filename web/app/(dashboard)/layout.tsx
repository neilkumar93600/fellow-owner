import type { Metadata } from 'next';

// Every signed-in screen (the studio, the member pages under /{handle}, account, onboarding) stays out
// of search results; pages keep their own titles.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Passthrough: proxy.ts already sends visitors without a session to sign in. /dashboard and the member
// pages under /{handle} bring their own shells; /onboarding renders its own frame.
export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
