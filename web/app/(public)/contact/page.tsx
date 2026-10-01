import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Contact' };

export default function Page() {
  return (
    <ComingSoon
      title="Contact"
      description="Questions, pilots and press. A contact form lands here soon."
    />
  );
}
