import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type * as React from 'react';
import { safeReturnTo } from '@/components/auth/auth-return-to';
import { AppShell } from '@/components/layout/app-shell';
import { isSidebarExpanded, SIDEBAR_COOKIE } from '@/components/layout/dashboard-nav';
import { routes } from '@/lib/routes';
import { getStudioSpace } from '@/lib/server-api';

// The gate for every /dashboard screen: a stale or missing session goes to /login and comes back to the
// page that was asked for (proxy.ts forwards its path as x-return-to); an account with no space goes to
// /onboarding. The space is the live one, and the shell keeps it fresh from React Query afterwards. The
// sidebar's fo_sidebar cookie is read here so the first HTML already has the right rail width.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const gate = await getStudioSpace();
  if ('error' in gate) {
    if (gate.error === 'no-space') redirect(routes.onboarding());
    const returnTo = safeReturnTo((await headers()).get('x-return-to'));
    redirect(routes.auth.login(returnTo ?? routes.dashboard.today()));
  }
  const defaultExpanded = isSidebarExpanded((await cookies()).get(SIDEBAR_COOKIE)?.value);
  return (
    <AppShell space={gate.space} defaultExpanded={defaultExpanded}>
      {children}
    </AppShell>
  );
}
