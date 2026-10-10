import { ChevronRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { cn } from '@/components/ui/cn';
import { type CardTint, TINT_STYLES } from './tint';
import { Trend } from './trend';

export interface StatCardProps {
  tint: CardTint;
  icon: LucideIcon;
  value: number;
  label: string;
  /** Change against the previous period; null when there is nothing to compare with. */
  changePct: number | null;
  /** The words after the trend figure. */
  descriptor?: string;
  /** The list this stat counts. */
  href: string;
  className?: string;
}

/**
 * DESIGN.md Stat card (Today only, three at most): the 56px tile, the Stat number with its Small Strong
 * label stacked beside it, then the trend row across the card. The whole card links to the list it
 * counts. Hover keeps the tint: the label steps to ink and a chevron fades in; press is 0.98.
 */
export function StatCard({
  tint,
  icon: Icon,
  value,
  label,
  changePct,
  descriptor = 'vs last week',
  href,
  className,
}: StatCardProps) {
  const styles = TINT_STYLES[tint];
  return (
    <Link
      href={href}
      className={cn(
        'group press relative grid grid-cols-[56px_1fr] items-center gap-x-4 gap-y-0.5 rounded-panel p-6 text-ink shadow-[inset_1px_1px_0_rgb(255_255_255/0.7),var(--shadow-glass)] hover:border-white',
        styles.card,
        className,
      )}
    >
      <span className={cn('row-span-2 grid size-14 place-items-center rounded-2xl', styles.tile)}>
        <Icon aria-hidden="true" strokeWidth={1.5} className={cn('size-6', styles.icon)} />
      </span>
      <NumberTicker value={value} className="self-end text-stat text-ink" />
      <span className="self-start text-small-strong text-ink-soft transition-colors duration-150 ease-out-quart group-hover:text-ink">
        {label}
      </span>
      <Trend
        changePct={changePct}
        descriptor={descriptor}
        surface={tint === 'lavender' ? 'lavender' : 'default'}
        className="col-span-full mt-4"
      />
      <ChevronRight
        aria-hidden="true"
        strokeWidth={1.5}
        className="absolute top-6 right-6 size-4 text-ink opacity-0 transition-opacity duration-150 ease-out-quart group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </Link>
  );
}
