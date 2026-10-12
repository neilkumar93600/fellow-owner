import type { Metadata } from 'next';
import { PerformanceScreen } from '@/components/dashboard/performance/performance-screen';

export const metadata: Metadata = { title: 'Performance' };

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Performance</h1>
      <PerformanceScreen />
    </div>
  );
}
