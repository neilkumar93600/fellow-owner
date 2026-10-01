import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Inbox' };

export default function Page() {
  return <ComingSoon title="Inbox" description="Every pitch, sorted by fit, with the reason." />;
}
