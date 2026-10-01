import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Terms of service' };

export default function Page() {
  return (
    <ComingSoon
      title="Terms of service"
      description="The rules for creators and members using Fellow Owners."
    />
  );
}
