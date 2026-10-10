import type { Metadata } from 'next';
import { readAuthRequest } from '@/components/auth/auth-server';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { redirectIfSignedIn } from '../redirect-signed-in';

// Linked from the Password label on /login. Per-visitor, so not indexed.
export const metadata: Metadata = { title: 'Reset your password', robots: { index: false } };

// returnTo rides along, so a reset that ends in logging in still lands where the visitor was headed.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { returnTo } = await readAuthRequest(searchParams);
  await redirectIfSignedIn(returnTo);
  return <ForgotPasswordForm returnTo={returnTo} />;
}
