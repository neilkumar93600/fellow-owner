import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageFrame } from '@/components/marketing/page-frame';
import { buttonVariants } from '@/components/ui/button-variants';
import { DISPLAY_H1 } from '@/lib/constants';

// Where the confirm and unsubscribe links in newsletter emails land (the API redirects here).
export const metadata: Metadata = {
  title: 'Newsletter',
  robots: { index: false },
};

const NOTICES: Record<string, { title: string; body: string }> = {
  confirmed: {
    title: 'You are on the list',
    body: 'Thanks for confirming. Creator notes will reach this address about once a month.',
  },
  unsubscribed: {
    title: 'You are unsubscribed',
    body: 'We will not send you the newsletter again. You can sign up again any time from the footer.',
  },
  invalid: {
    title: 'That link did not work',
    body: 'It may be incomplete or too old. Sign up again from the footer and we will send a fresh link.',
  },
};

export default async function Page({ params }: { params: Promise<{ status: string }> }) {
  const { status } = await params;
  const notice = NOTICES[status];
  if (!notice) notFound();
  return (
    <PageFrame>
      <header className="max-w-[68ch]">
        <h1 className={DISPLAY_H1}>{notice.title}</h1>
        <p className="mt-3 text-body text-ink">{notice.body}</p>
        <Link href="/" className={`${buttonVariants()} mt-6`}>
          Back to Fellow Owners
        </Link>
      </header>
    </PageFrame>
  );
}
