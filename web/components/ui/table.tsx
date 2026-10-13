import type * as React from 'react';
import { cn } from './cn';

/*
 * Table (DESIGN.md data table): plain table parts for a `glass-strong` panel behind a "Table" toggle,
 * since card lists are the default view. Headers are mono 12px caps in ink-muted over an Ash hairline;
 * rows are 48px of mono graphite, ruled by Ash hairlines, lifting to white 80% on hover and resting at
 * white 90% when `aria-selected`. Figures are tabular. The wrapper scrolls sideways inside its own width
 * and never widens the page. For the full product table (stacked rows on phones, row links, side panel)
 * use components/shared/data-table.tsx.
 *
 * <div className="glass-strong p-4">
 *   <Table>
 *     <TableCaption>Your last 10 posts</TableCaption>
 *     <TableHeader><TableRow><TableHead>Post</TableHead><TableHead className="text-right">Views</TableHead></TableRow></TableHeader>
 *     <TableBody><TableRow><TableCell className="text-ink">Lisbon in 48 hours</TableCell><TableCell className="text-right">12,400</TableCell></TableRow></TableBody>
 *   </Table>
 * </div>
 *
 * No client directive, so server pages (the media kit rates) render it.
 */

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto contain-inline-size"
    >
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-small text-ink-soft', className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('[&_tr]:border-b [&_tr]:hover:bg-transparent', className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
}

export function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        'border-t border-line bg-white/50 font-medium text-ink [&>tr]:last:border-b-0',
        className,
      )}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b border-line transition-colors duration-150 ease-out-quart hover:bg-white/80 has-aria-expanded:bg-white/80 aria-selected:bg-white/90',
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-10 px-3 text-left align-middle text-caption font-medium tracking-tight whitespace-nowrap text-ink-muted uppercase',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('h-12 px-3 align-middle whitespace-nowrap', className)}
      {...props}
    />
  );
}

export function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      // Left-aligned: a centred caption sits off-screen when the table scrolls sideways on a phone.
      className={cn('mt-3 text-left text-small text-ink-muted', className)}
      {...props}
    />
  );
}
