import type { Metadata } from 'next';
import { readAuthRequest } from '@/components/auth/auth-server';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

// The second half of the password reset, reached from /forgot-password. Not indexed.
export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false } };

// returnTo rides along, so a reset that ends in logging in still lands where the visitor was headed.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { returnTo } = await readAuthRequest(searchParams);
  return <ResetPasswordForm returnTo={returnTo} />;
}
