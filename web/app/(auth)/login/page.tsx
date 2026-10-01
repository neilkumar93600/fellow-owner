import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Sign in' };

export default function Page() {
  return (
    <ComingSoon
      title="Sign in"
      description="Sign in with a 6-digit email code, or with Google outside in-app browsers."
    />
  );
}
