import type { PublicSpace } from '@fellow-owners/shared';
import { GlassPanel } from '@/components/shared/glass-panel';

/**
 * /{handle}/work-with-me (F5, public): the brand form (brand, contact, email, website, budget,
 * deliverables, timeline, message, consent, Turnstile). Wave A placeholder holding the page's one
 * h1; B4 builds the form on useSubmitWorkWithMe (hooks/queries/use-brands).
 */
export function WorkWithMeScreen({ space }: { space: Pick<PublicSpace, 'displayName'> }) {
  return (
    <GlassPanel strength="strong" className="flex flex-col gap-3 p-6 sm:p-8">
      <h1 className="text-h1 text-ink">Work with {space.displayName}</h1>
      <p className="max-w-[60ch] font-sans text-body text-ink-soft">
        A form for brand partnerships is on its way. Until then, send {space.displayName} an idea
        from the bio page.
      </p>
    </GlassPanel>
  );
}
