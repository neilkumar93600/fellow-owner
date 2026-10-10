import { notFound, redirect } from 'next/navigation';
import type * as React from 'react';
import { FanShell } from '@/components/layout/fan-shell';
import { FanTopbar } from '@/components/layout/fan-topbar';
import { routes } from '@/lib/routes';
import { getFreshSpacePage, getViewerMembership } from '@/lib/server-api';

// Member pages (c/, p/, new, pitch (Send an idea), me): the fan shell with the creator, the community switcher and the
// viewer's menu. Signed-out visitors are sent to sign in by proxy.ts (this also catches an expired
// session). Non-members pass: the feed shows them its locked preview, the idea form is open to them, and
// the pages that need membership send them to Join themselves, keeping their own return path.
export default async function MemberLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const [page, viewer] = await Promise.all([
    getFreshSpacePage(handle),
    getViewerMembership(handle),
  ]);
  if (!page) notFound();
  if (!viewer.signedIn) redirect(routes.auth.login(routes.fan.space(handle)));

  return (
    <FanShell
      topbar={<FanTopbar space={page.space} communities={page.communities} viewer={viewer} />}
    >
      {children}
    </FanShell>
  );
}
