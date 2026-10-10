import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';
import { cn } from '@/components/ui/cn';

export interface DataTableColumn<Row> {
  key: string;
  /** Header label; the actions column passes a visually hidden one (<span className="sr-only">). */
  header: React.ReactNode;
  cell: (row: Row) => React.ReactNode;
  /** CSS width hint, such as '40%' or '120px'. */
  width?: string;
  /** Takes the width the other columns leave and truncates its text (a summary, a title). One per table. */
  grow?: boolean;
  align?: 'start' | 'end';
  /**
   * The sender or name column, one per table: a link to getRowHref(row), else a button when the table
   * has onRowOpen. It is the keyboard path into the side panel, and leads the stacked rows on phones.
   */
  primary?: boolean;
  /** Before the primary link and outside it, such as the 28px avatar. */
  leading?: (row: Row) => React.ReactNode;
  /** Hidden below this width. Stacked rows (under 768px) show only columns without hideBelow. */
  hideBelow?: 'md' | 'lg';
}

export interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowId: (row: Row) => string;
  /** The row's own URL (?item=), the primary link's target. */
  getRowHref?: (row: Row) => string;
  /** Opens the row's side panel: a click anywhere on the row outside its controls, or the primary cell. */
  onRowOpen?: (row: Row) => void;
  /** The row whose side panel is open; it rests at white 90% with aria-selected. */
  selectedId?: string | null;
  /** full: a page's table in its own strong glass panel. compact: a table inside another card. */
  variant?: 'full' | 'compact';
  /** Names the table for screen readers. */
  caption: string;
  /** Shown in place of the rows when there are none. */
  empty?: React.ReactNode;
  className?: string;
}

const HIDE = { md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' } as const;
const CONTROLS = 'a, button, input, select, textarea, label, [role="button"], [tabindex]';

/** The primary cell's target. With onRowOpen the screen opens the panel itself; modified clicks still open the link in a new tab. */
function PrimaryTarget({
  href,
  onOpen,
  className,
  children,
}: {
  href?: string;
  onOpen?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  if (href) {
    return (
      <Link
        href={href}
        className={className}
        onClick={
          onOpen
            ? (event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                onOpen();
              }
            : undefined
        }
      >
        {children}
      </Link>
    );
  }
  if (onOpen) {
    return (
      <button type="button" onClick={onOpen} className={cn('text-left', className)}>
        {children}
      </button>
    );
  }
  return <span className={className}>{children}</span>;
}

/**
 * DESIGN.md Data table (behind the "Table" toggle; card lists are the default). full: a strong glass
 * panel (radius 28, 16px padding) with a white 70% 48px pill header in Small Strong ink, 48px rows of
 * Small ink-soft cells ruled at ink 10%, lifting to white 80% on hover, focus within and selection.
 * compact (inside cards): Small ink-muted headers over the same rule and unfilled rows. Under 768px each row stacks: the primary cell, then
 * the other cells (pills), then a chevron, the whole item one tap target.
 *
 * No client directive: a server page can render a static table with links; a client screen passes
 * onRowOpen and selectedId. The table never widens its container (inline-size containment): it takes
 * the width it is given and scrolls sideways inside when its columns need more.
 */
export function DataTable<Row>({
  columns,
  rows,
  getRowId,
  getRowHref,
  onRowOpen,
  selectedId,
  variant = 'full',
  caption,
  empty,
  className,
}: DataTableProps<Row>) {
  const full = variant === 'full';
  const primary = columns.find((column) => column.primary) ?? columns[0];
  const stacked = columns.filter((column) => column !== primary && !column.hideBelow);

  return (
    <div className={cn('contain-inline-size', full && 'glass-strong p-4', className)}>
      {rows.length === 0 ? (
        empty
      ) : (
        <>
          <div className={cn('hidden overflow-x-auto md:block', !full && '-mx-3')}>
            <table className="w-full border-separate border-spacing-0 text-small text-ink-soft">
              <caption className="sr-only">{caption}</caption>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      style={column.width ? { width: column.width } : undefined}
                      className={cn(
                        'text-left whitespace-nowrap',
                        full
                          ? 'h-12 bg-white/70 px-6 text-small-strong text-ink first:rounded-l-full last:rounded-r-full'
                          : 'h-10 border-b border-ink/10 px-3 font-normal text-ink-muted',
                        column.grow && 'w-full',
                        column.align === 'end' && 'text-right',
                        column.hideBelow && HIDE[column.hideBelow],
                      )}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody
                className={cn(
                  full &&
                    '[&>tr:first-child>td]:border-t-8 [&>tr:first-child>td]:border-t-transparent',
                )}
              >
                {rows.map((row) => {
                  const id = getRowId(row);
                  const open = onRowOpen ? () => onRowOpen(row) : undefined;
                  return (
                    <tr
                      key={id}
                      aria-selected={selectedId === undefined ? undefined : selectedId === id}
                      onClick={
                        open
                          ? (event) => {
                              if (!(event.target as Element).closest(CONTROLS)) open();
                            }
                          : undefined
                      }
                      className={cn('group/row', open && 'cursor-pointer')}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            'h-12 border-b border-ink/10 whitespace-nowrap transition-colors duration-150 ease-out-quart',
                            'group-focus-within/row:bg-white/80 group-hover/row:bg-white/80 group-aria-selected/row:bg-white/90',
                            full ? 'px-6' : 'px-3',
                            column.grow && 'w-full max-w-0 truncate',
                            column.align === 'end' && 'text-right',
                            column.hideBelow && HIDE[column.hideBelow],
                          )}
                        >
                          {column === primary ? (
                            <span className="inline-flex max-w-full items-center gap-3 align-middle">
                              {column.leading?.(row)}
                              <PrimaryTarget
                                href={getRowHref?.(row)}
                                onOpen={open}
                                className="min-w-0 truncate rounded-sm underline-offset-3 hover:underline"
                              >
                                {column.cell(row)}
                              </PrimaryTarget>
                            </span>
                          ) : (
                            column.cell(row)
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul aria-label={caption} className={cn('md:hidden', !full && '-mx-3')}>
            {rows.map((row) => {
              const id = getRowId(row);
              const href = getRowHref?.(row);
              const open = onRowOpen ? () => onRowOpen(row) : undefined;
              return (
                <li
                  key={id}
                  className={cn(
                    'relative flex min-h-16 items-center gap-3 border-b border-ink/10 px-4 py-3 transition-colors duration-150 ease-out-quart hover:bg-white/80 has-focus-visible:bg-white/80',
                    selectedId === id && 'bg-white/90',
                  )}
                >
                  {primary.leading?.(row)}
                  <div className="min-w-0 flex-1">
                    <PrimaryTarget
                      href={href}
                      onOpen={open}
                      className="block w-full truncate text-small-strong text-ink outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ink"
                    >
                      {primary.cell(row)}
                    </PrimaryTarget>
                    {stacked.length ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-small text-ink-soft">
                        {stacked.map((column) => (
                          <span key={column.key} className="inline-flex min-w-0 items-center">
                            {column.cell(row)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {href || open ? (
                    <ChevronRight
                      aria-hidden="true"
                      strokeWidth={1.5}
                      className="size-5 shrink-0 text-ink-soft"
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
