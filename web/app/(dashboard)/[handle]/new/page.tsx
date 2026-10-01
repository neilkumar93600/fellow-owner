import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'New post' };

export default function Page() {
  return <ComingSoon title="New post" description="Share an idea, a project or a discussion." />;
}
