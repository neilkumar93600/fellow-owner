import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Pricing' };

export default function Page() {
  return <ComingSoon title="Pricing" description="Free during the pilot. Plans come later." />;
}
