import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Join this space' };

export default function Page() {
  return (
    <ComingSoon
      title="Join this space"
      description="Sign in, write a line about yourself, and pick your communities in under a minute."
    />
  );
}
