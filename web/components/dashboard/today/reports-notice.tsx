'use client';

import { Flag } from 'lucide-react';
import Link from 'next/link';
import { Banner } from '@/components/shared/banner';
import { useOpenReportCount } from '@/hooks/queries/use-reports';
import { routes } from '@/lib/routes';

/** "N reports need a look" on Today; nothing when the queue is empty. */
export function ReportsNotice() {
  const { data: count } = useOpenReportCount();
  if (!count) return null;
  return (
    <Banner icon={Flag}>
      {count === 1 ? '1 report needs' : `${count} reports need`} a look.{' '}
      <Link href={routes.dashboard.reports()} className="underline underline-offset-2">
        Open reports
      </Link>
    </Banner>
  );
}
