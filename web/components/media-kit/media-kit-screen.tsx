import type { PublicSpace } from '@fellow-owners/shared';
import { GlassPanel } from '@/components/shared/glass-panel';

/**
 * /{handle}/media-kit (F6, public): reach, engagement, top posts, audience note, rates and the
 * Work with me link, from the MediaKit read (lib/server-api.ts getMediaKit). Wave A placeholder
 * holding the page's one h1; B4 builds the page.
 */
export function MediaKitScreen({ space }: { space: Pick<PublicSpace, 'displayName'> }) {
  return (
    <GlassPanel strength="strong" className="flex flex-col gap-3 p-6 sm:p-8">
      <h1 className="text-h1 text-ink">{space.displayName}’s media kit</h1>
      <p className="max-w-[60ch] font-sans text-body text-ink-soft">
        Reach, engagement and rates for brands will show here.
      </p>
    </GlassPanel>
  );
}
