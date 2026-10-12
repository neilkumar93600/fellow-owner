import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readAuthRequest } from '@/components/auth/auth-server';
import { JoinStepper } from '@/components/join/join-stepper';
import { routes } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';
import { getSpacePage, getViewerMembership } from '@/lib/server-api';

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getSpacePage((await params).handle);
  if (!page) notFound();
  const { displayName, handle } = page.space;
  return pageMetadata({
    title: `Join ${displayName}’s space`,
    description: `Join ${displayName}’s communities on Fellow Owners in under a minute.`,
    path: routes.fan.join(handle),
    noindex: true,
  });
}

export default async function Page({ params, searchParams }: Props) {
  const { handle } = await params;
  // The user agent is checked on the server, so the Google pill never flashes in in-app browsers.
  const [page, viewer, { inAppBrowser, returnTo }] = await Promise.all([
    getSpacePage(handle),
    getViewerMembership(handle),
    readAuthRequest(searchParams),
  ]);
  if (!page) notFound();
  return (
    <JoinStepper
      space={page.space}
      communities={page.communities}
      initialInApp={inAppBrowser}
      initialSignedIn={viewer.signedIn}
      returnTo={returnTo}
    />
  );
}
