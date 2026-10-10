import { Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { GlassPanel } from '@/components/shared/glass-panel';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { routes } from '@/lib/routes';

/**
 * "Send Mira an idea": the bio's one coral action, in its own glass panel between the rooms and the
 * fans' walls, so a visitor meets it without scrolling the whole page.
 */
export function PitchCta({ handle, firstName }: { handle: string; firstName: string }) {
  return (
    <GlassPanel
      strength="strong"
      className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-[1.75rem] leading-[1.15] text-ink">
          Got an idea for {firstName}?
        </h2>
        <p className="max-w-[44ch] text-body text-ink">
          A collab, a brand deal, a place to see. {firstName} reads every one here.
        </p>
      </div>
      <Link
        href={routes.fan.pitch(handle)}
        className={cn(buttonVariants(), 'w-full shrink-0 sm:w-auto')}
      >
        <Lightbulb aria-hidden="true" className="size-5" />
        Send {firstName} an idea
      </Link>
    </GlassPanel>
  );
}
