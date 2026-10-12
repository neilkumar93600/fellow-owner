import { CalendarDays } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { GlassPanel } from '@/components/shared/glass-panel';

/**
 * /dashboard/planner (F3 Content planner: week, month and list views). Wave A placeholder; B2
 * builds it from usePlan, the plan item mutations, useBestTimes and useCaptionDraft
 * (hooks/queries/use-planner).
 */
export function PlannerScreen() {
  return (
    <GlassPanel strength="strong">
      <EmptyState
        icon={CalendarDays}
        title="Planner"
        body="Plan your posts on a calendar and get a reminder with the caption ready to copy."
      />
    </GlassPanel>
  );
}
