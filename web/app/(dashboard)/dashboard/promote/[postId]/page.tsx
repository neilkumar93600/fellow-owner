import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Promote composer' };

export default function Page() {
  return (
    <ComingSoon
      title="Promote composer"
      description="Drafts per platform in your voice, a showcase page and a short link."
    />
  );
}
