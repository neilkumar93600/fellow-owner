import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

// Built but not linked: email codes are the default and password sign-in is off (01-prd Q8).
export const metadata: Metadata = { title: 'Reset your password', robots: { index: false } };

export default function Page() {
  return <ForgotPasswordForm />;
}
