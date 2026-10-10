import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SplitFrame } from '@/components/auth/auth-shell';
import { OnboardingStepper } from '@/components/onboarding/onboarding-stepper';
import { routes } from '@/lib/routes';
import { getStudioSpace } from '@/lib/server-api';

// Create your space (03-app-flow §2, F3): handle and name, platforms, communities, taste profile.
export const metadata: Metadata = {
  title: 'Create your space',
  robots: { index: false, follow: false },
};

// The frame is the auth screens' (server-rendered); the stepper fills both of its columns.
// Someone who already has a space belongs on Today; a stale session goes back to sign in. If the API is
// down, the wizard still renders: creating the space reports its own failure.
export default async function Page() {
  const gate = await getStudioSpace().catch(() => null);
  if (gate && 'space' in gate) redirect(routes.dashboard.today());
  if (gate?.error === 'unauthorized') redirect(routes.auth.login(routes.onboarding()));
  return (
    <SplitFrame>
      <OnboardingStepper />
    </SplitFrame>
  );
}
