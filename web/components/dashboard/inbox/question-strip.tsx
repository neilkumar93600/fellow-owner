import { ArrowRight, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { formatNumber, pluralize } from '@/lib/format';
import { routes } from '@/lib/routes';

/**
 * Top of Fan mail: how many things fans keep asking for are waiting (the "What fans want" screen), and a
 * secondary way in. Renders nothing when no request is open.
 */
export function QuestionStrip({
  groups,
  people,
  className,
}: {
  /** Open requests. */
  groups: number;
  /** Fans who asked across those requests. */
  people: number;
  className?: string;
}) {
  if (groups === 0) return null;
  return (
    <section
      aria-labelledby="question-strip-title"
      className={cn(
        'glass flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[24px] px-5 py-4',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-11 shrink-0 place-items-center rounded-full bg-aurora-lilac"
      >
        <Lightbulb strokeWidth={1.5} className="size-5 text-ink" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="question-strip-title" className="text-label-strong text-ink">
          What fans want
        </h2>
        <p className="text-small text-ink-soft">
          <span className="tabular-nums">{formatNumber(people)}</span>{' '}
          {pluralize(people, 'fan', 'fans')} asked for{' '}
          <span className="tabular-nums">{formatNumber(groups)}</span>{' '}
          {pluralize(groups, 'thing', 'things')}. Make each one once and everyone gets it.
        </p>
      </div>
      <Link
        href={routes.dashboard.questions()}
        className={cn(
          buttonVariants({ variant: 'secondary', size: 'md', surface: 'glass' }),
          'max-sm:w-full',
        )}
      >
        See what fans want
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </section>
  );
}
