import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { GlassPanel } from '@/components/shared/glass-panel';
import { buttonVariants } from '@/components/ui/button-variants';
import { routes } from '@/lib/routes';

/**
 * "Make it" from What fans want lands here with ?title=. The AI drafts from a fan idea, so there is no
 * post-less composer: this says what is being made and sends Mira to pick the idea it grows from, whose
 * composer then opens with the title as her headline (?title= on /dashboard/promote/[postId]).
 */
export function MakeItBanner({ title }: { title: string }) {
  return (
    <GlassPanel
      as="section"
      strength="strong"
      aria-label="Making a request"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[24px] p-5"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-aurora-peach text-ink">
        <Sparkles aria-hidden="true" strokeWidth={1.5} className="size-5" />
      </span>
      <div className="min-w-[14rem] flex-1">
        <p className="text-label-strong text-ink">Making &ldquo;{title}&rdquo;</p>
        <p className="text-small text-ink-soft">
          Pick the fan idea it grows from. The AI drafts in your voice, and you approve every word.
        </p>
      </div>
      <Link
        href={routes.dashboard.ideas()}
        className={buttonVariants({ variant: 'secondary', size: 'md' })}
      >
        Choose an idea
      </Link>
      <Link
        href={routes.dashboard.promote()}
        className={buttonVariants({ variant: 'ghost', size: 'md', surface: 'glass' })}
      >
        Not now
      </Link>
    </GlassPanel>
  );
}
