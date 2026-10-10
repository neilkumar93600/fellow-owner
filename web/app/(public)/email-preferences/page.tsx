import type { Metadata } from 'next';
import Link from 'next/link';
import { EmailPrefsPanel } from '@/components/account/email-prefs-panel';
import { PageFrame } from '@/components/marketing/page-frame';
import { Banner } from '@/components/shared/banner';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { DISPLAY_H1 } from '@/lib/constants';
import { routes } from '@/lib/routes';
import { UnsubscribeButton } from './unsubscribe-button';

// Where the unsubscribe link in every notification email lands, with ?token=. Opening it changes
// nothing (mail link scanners open every link): the button POSTs the token, then the page shows
// ?status=unsubscribed or ?status=invalid. The switches show for a signed-in person.
export const metadata: Metadata = {
  title: 'Email preferences',
  robots: { index: false },
};

const NOTICES: Record<string, string> = {
  unsubscribed:
    'You are unsubscribed. We will not send you notification emails. Sign-in codes still arrive by email.',
  invalid:
    'That unsubscribe link didn’t work. It may be incomplete. Use the switches below instead.',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { status, token } = await searchParams;
  const notice = typeof status === 'string' ? NOTICES[status] : undefined;
  return (
    <PageFrame>
      <header className="max-w-[68ch]">
        <h1 className={DISPLAY_H1}>
          Email <em>preferences</em>
        </h1>
        <p className="mt-3 text-body text-ink">
          Choose which Fellow Owners notifications also reach your inbox.
        </p>
      </header>
      {notice ? <Banner className="mt-6">{notice}</Banner> : null}
      {typeof token === 'string' && token ? <UnsubscribeButton token={token} /> : null}
      <EmailPrefsPanel />
      <Link href={routes.home()} className={cn(buttonVariants({ variant: 'secondary' }), 'mt-8')}>
        Back to Fellow Owners
      </Link>
    </PageFrame>
  );
}
