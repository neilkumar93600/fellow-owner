import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Create your space' };

export default function Page() {
  return (
    <ComingSoon
      title="Create your space"
      description="Handle, platforms, communities and your taste profile, in four steps."
    />
  );
}
