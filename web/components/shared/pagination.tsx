import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/components/ui/cn';

/** The run of `size` pages around `page`, kept inside 1..count. */
function windowOf(page: number, count: number, size: number): [number, number] {
  const start = Math.min(Math.max(1, page - Math.floor(size / 2)), Math.max(1, count - size + 1));
  return [start, Math.min(count, start + size - 1)];
}

const CIRCLE =
  'press grid size-10 shrink-0 place-items-center rounded-full border border-white/70 bg-white/60 text-ink disabled:cursor-not-allowed disabled:opacity-50';

function Ellipsis({ desktop, phone }: { desktop: boolean; phone: boolean }) {
  if (!desktop && !phone) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'w-5 shrink-0 place-items-center text-small text-ink-soft',
        desktop ? 'grid' : 'hidden',
        phone ? 'max-sm:grid' : 'max-sm:hidden',
      )}
    >
      …
    </span>
  );
}

export interface PaginationProps {
  /** 1-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** The nav's accessible name. */
  label?: string;
  className?: string;
}

/**
 * DESIGN.md Pagination: a glass pill group (4px by 12px padding): two frosted circles for previous and
 * next (50% at either end), up to five 60 by 32px page pills 2px apart (the current one white with a
 * sunset underline, Small Strong ink, aria-current). Past five pages an ellipsis marks the hidden ones; below
 * 640px three narrower pills keep it inside a 360px screen. Renders nothing for a single page.
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  label = 'Pagination',
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;
  const current = Math.min(Math.max(1, page), pageCount);
  const [start, end] = windowOf(current, pageCount, 5);
  const [phoneStart, phoneEnd] = windowOf(current, pageCount, 3);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <nav
      aria-label={label}
      className={cn('glass inline-flex items-center gap-0.5 rounded-full px-3 py-1', className)}
    >
      <button
        type="button"
        aria-label="Previous page"
        disabled={current <= 1}
        onClick={() => onPageChange(current - 1)}
        className={cn(CIRCLE, 'mr-1.5 not-disabled:hover:bg-white/90')}
      >
        <ChevronLeft aria-hidden="true" strokeWidth={1.5} className="size-5" />
      </button>
      <Ellipsis desktop={start > 1} phone={phoneStart > 1} />
      {pages.map((n) => {
        const isCurrent = n === current;
        return (
          <button
            key={n}
            type="button"
            aria-label={`Page ${n}`}
            aria-current={isCurrent ? 'page' : undefined}
            onClick={() => onPageChange(n)}
            className={cn(
              'press grid h-8 w-15 shrink-0 place-items-center rounded-full max-sm:w-11',
              isCurrent
                ? 'bg-white text-small-strong text-ink shadow-[inset_0_-2px_0_var(--color-sunset)]'
                : 'text-small text-ink-soft hover:bg-white/70',
              (n < phoneStart || n > phoneEnd) && 'max-sm:hidden',
            )}
          >
            {n}
          </button>
        );
      })}
      <Ellipsis desktop={end < pageCount} phone={phoneEnd < pageCount} />
      <button
        type="button"
        aria-label="Next page"
        disabled={current >= pageCount}
        onClick={() => onPageChange(current + 1)}
        className={cn(CIRCLE, 'ml-1.5 not-disabled:hover:bg-white/90')}
      >
        <ChevronRight aria-hidden="true" strokeWidth={1.5} className="size-5" />
      </button>
    </nav>
  );
}
