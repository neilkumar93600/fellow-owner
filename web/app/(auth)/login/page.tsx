import type { Metadata } from 'next';
import { readAuthRequest } from '@/components/auth/auth-server';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { returnTo, inAppBrowser, oauthError } = await readAuthRequest(searchParams);
  return <LoginForm returnTo={returnTo} inAppBrowser={inAppBrowser} oauthError={oauthError} />;
}
