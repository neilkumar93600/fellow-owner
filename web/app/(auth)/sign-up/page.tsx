import type { Metadata } from 'next';
import { readAuthRequest } from '@/components/auth/auth-server';
import { SignUpForm } from '@/components/auth/sign-up-form';

export const metadata: Metadata = { title: 'Create your account' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { returnTo, inAppBrowser } = await readAuthRequest(searchParams);
  return <SignUpForm returnTo={returnTo} inAppBrowser={inAppBrowser} />;
}
