import type { Metadata } from 'next';
import { readAuthRequest } from '@/components/auth/auth-server';
import { CreateAccountForm } from '@/components/auth/create-account-form';
import { redirectIfSignedIn } from '../redirect-signed-in';

// Not worth ranking, but its links (terms, privacy, log in) are fine to follow.
export const metadata: Metadata = {
  title: 'Create your account',
  robots: { index: false, follow: true },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ returnTo, inAppBrowser, oauthError }, params] = await Promise.all([
    readAuthRequest(searchParams),
    searchParams,
  ]);
  // ?handle= (from /start, the hero's claim bar) pre-fills the Handle field; the form validates it as typed.
  const raw = Array.isArray(params.handle) ? params.handle[0] : params.handle;
  const handle = typeof raw === 'string' && raw.length <= 64 ? raw : null;
  await redirectIfSignedIn(returnTo, handle);
  return (
    <CreateAccountForm
      returnTo={returnTo}
      inAppBrowser={inAppBrowser}
      oauthError={oauthError}
      initialHandle={handle}
    />
  );
}
