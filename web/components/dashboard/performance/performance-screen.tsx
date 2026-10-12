import { ChartLine } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { GlassPanel } from '@/components/shared/glass-panel';

/**
 * /dashboard/performance (F1 Post performance + F2 Profile score). Wave A placeholder; B1 builds the
 * page from usePerformance, usePerformancePosts and useProfileScore (hooks/queries/use-performance).
 */
export function PerformanceScreen() {
  return (
    <GlassPanel strength="strong">
      <EmptyState
        icon={ChartLine}
        title="Performance"
        body="Reach, engagement and your best times to post will show here once your platforms are linked."
      />
    </GlassPanel>
  );
}
