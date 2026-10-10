import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageFrame } from '@/components/marketing/page-frame';
import { DISPLAY_H1 } from '@/lib/constants';
import { routes } from '@/lib/routes';
import { NewsletterTokenAction } from '../token-action';

// Where the confirm link in a newsletter email lands. Opening it changes nothing; the button does.
export const metadata: Metadata = {
  title: 'Newsletter',
  robots: { index: false },
};

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await searchParams;
  if (typeof token !== 'string' || !token) redirect(routes.newsletter('invalid'));
  return (
    <PageFrame>
      <header className="max-w-[68ch]">
        <h1 className={DISPLAY_H1}>Confirm your email</h1>
        <p className="mt-3 text-body text-ink">
          One click and creator notes will reach this address about once a month.
        </p>
        <NewsletterTokenAction action="confirm" token={token} label="Confirm my email" />
      </header>
    </PageFrame>
  );
}
