import type { Metadata } from 'next';
import { TodayContainer } from '@/components/dashboard/today/today-container';

export const metadata: Metadata = { title: 'Today' };

export default function Page() {
  return <TodayContainer />;
}
