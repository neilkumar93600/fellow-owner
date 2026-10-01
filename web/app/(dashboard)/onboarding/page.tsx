import type { Metadata } from 'next';
import { OnboardingStepper } from '@/components/onboarding/onboarding-stepper';

// Create your space (03-app-flow §2, F3): handle and name, platforms, communities, taste profile.
export const metadata: Metadata = {
  title: 'Create your space',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <OnboardingStepper />;
}
