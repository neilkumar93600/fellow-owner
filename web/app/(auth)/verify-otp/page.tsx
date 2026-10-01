import type { Metadata } from 'next';
import { readAuthRequest } from '@/components/auth/auth-server';
import { OtpForm } from '@/components/auth/otp-form';

export const metadata: Metadata = { title: 'Enter your code', robots: { index: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { returnTo } = await readAuthRequest(searchParams);
  return <OtpForm returnTo={returnTo} />;
}
