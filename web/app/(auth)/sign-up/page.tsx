import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Create your account' };

export default function Page() {
  return (
    <ComingSoon
      title="Create your account"
      description="Name and email, then a 6-digit code. Same step as signing in."
    />
  );
}
