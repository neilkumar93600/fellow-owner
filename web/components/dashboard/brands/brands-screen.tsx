import { BriefcaseBusiness } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { GlassPanel } from '@/components/shared/glass-panel';

/**
 * /dashboard/brands (F5 Brand inbox). Wave A placeholder; B4 builds it from useBrandRequests,
 * useBrandRequest and useUpdateBrandRequest (hooks/queries/use-brands).
 */
export function BrandsScreen() {
  return (
    <GlassPanel strength="strong">
      <EmptyState
        icon={BriefcaseBusiness}
        title="Brand deals"
        body="Requests from your Work with me form, your forwarding address and Instagram will land here."
      />
    </GlassPanel>
  );
}
