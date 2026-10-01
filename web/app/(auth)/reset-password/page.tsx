import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

// Built but not linked: email codes are the default and password sign-in is off (01-prd Q8).
export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false } };

export default function Page() {
  return <ResetPasswordForm />;
}
