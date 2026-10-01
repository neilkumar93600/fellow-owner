import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Asks' };

export default function Page() {
  return (
    <ComingSoon
      title="Asks"
      description="Post a request to your communities and get an AI summary of the answers."
    />
  );
}
