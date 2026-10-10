// Passthrough: proxy.ts already sends visitors without a session to sign in. /dashboard and the member
// pages under /{handle} bring their own shells; /onboarding renders its own frame.
export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
