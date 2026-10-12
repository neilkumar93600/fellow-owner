import { BriefcaseBusiness } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { GlassPanel } from '@/components/shared/glass-panel';

/**
 * Settings, Brand deals tab (F5 + F6): the forwarding address, the Instagram DM switch and the
 * media kit (on/off, rates, audience note). Wave A placeholder; B4 builds it on useBrandSettings,
 * useRotateInboundAlias, useInstagramConnect, useDisconnectInstagram (hooks/queries/use-brands)
 * and useUpdateMediaKit (hooks/queries/use-media-kit).
 */
export function BrandSettingsCard() {
  return (
    <GlassPanel strength="strong">
      <EmptyState
        icon={BriefcaseBusiness}
        title="Brand deals"
        body="Your forwarding address, Instagram messages and media kit settings will be here."
      />
    </GlassPanel>
  );
}
