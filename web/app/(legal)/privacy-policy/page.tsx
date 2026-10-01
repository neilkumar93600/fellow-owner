import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Privacy policy' };

export default function Page() {
  return (
    <ComingSoon
      title="Privacy policy"
      description="How Fellow Owners collects, uses and protects your data."
    />
  );
}
