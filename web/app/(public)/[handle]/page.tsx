import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Bio link page' };

export default function Page() {
  return (
    <ComingSoon
      title="Bio link page"
      description="A creator's communities, featured projects and a way to send a pitch."
    />
  );
}
