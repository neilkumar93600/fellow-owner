import type { Metadata } from 'next';
import { readAuthRequest } from '@/components/auth/auth-server';
import { LoginForm } from '@/components/auth/login-form';
import { redirectIfSignedIn } from '../redirect-signed-in';

// An indexed log-in screen has no search value and competes with the pages that do.
export const metadata: Metadata = {
  title: 'Log in',
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { returnTo, inAppBrowser, oauthError } = await readAuthRequest(searchParams);
  await redirectIfSignedIn(returnTo);
  return <LoginForm returnTo={returnTo} inAppBrowser={inAppBrowser} oauthError={oauthError} />;
}
