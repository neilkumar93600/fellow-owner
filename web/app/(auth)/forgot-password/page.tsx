import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Reset your password' };

export default function Page() {
  return (
    <ComingSoon
      title="Reset your password"
      description="Only needed if password sign-in is turned on. Email codes are the default."
    />
  );
}
