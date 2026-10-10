'use client';

import type * as React from 'react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { formatNumber } from '@/lib/format';

export interface ChartLegendItem {
  label: string;
  /** The series color, in series order: var(--chart-1) Marigold, var(--chart-2) Violet, var(--chart-3) Teal. */
  color: string;
}

/** Every value behind a chart: the first column names the row (a week, a type), the rest are figures. */
export interface ChartData {
  columns: string[];
  rows: (string | number)[][];
}

export interface ChartCardProps {
  title: string;
  legend?: ChartLegendItem[];
  /** A control at the top right, such as the range dropdown. */
  action?: React.ReactNode;
  /** One line under the chart that says what it shows ("Joins up 18% on last week"). */
  summary: string;
  /** Revealed as a table by the "Show data" toggle, so a stroke is never the only source of a value. */
  data?: ChartData;
  /** The chart. */
  children: React.ReactNode;
  className?: string;
}

/**
 * DESIGN.md Chart card: Paper White, H2 top left, legend (10px dots, Body ink-soft) top right, the chart,
 * a one-line Small summary and a "Show data" ghost toggle that reveals the values as a table. Steps up to
 * Pure White on hover.
 */
export function ChartCard({
  title,
  legend,
  action,
  summary,
  data,
  children,
  className,
}: ChartCardProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        'glass min-w-0 p-6 transition-colors duration-150 ease-out-quart hover:bg-white/72',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h2 id={`${id}-title`} className="text-h2 text-ink">
          {title}
        </h2>
        {legend || action ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {legend ? (
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
                {legend.map((item) => (
                  <li key={item.label} className="flex items-center gap-2 text-body text-ink-soft">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.label}
                  </li>
                ))}
              </ul>
            ) : null}
            {action}
          </div>
        ) : null}
      </div>

      <div className="mt-6">{children}</div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-small text-ink-soft">{summary}</p>
        {data ? (
          <Button
            variant="ghost"
            size="md"
            surface="white"
            aria-expanded={open}
            aria-controls={`${id}-data`}
            onClick={() => setOpen((value) => !value)}
            className="-mr-2"
          >
            {open ? 'Hide data' : 'Show data'}
          </Button>
        ) : null}
      </div>

      {data ? (
        <div id={`${id}-data`} hidden={!open} className="mt-3 overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-small text-ink-soft">
            <caption className="sr-only">{`${title}: the data`}</caption>
            <thead>
              <tr>
                {data.columns.map((column, i) => (
                  <th
                    key={column}
                    scope="col"
                    className={cn(
                      'h-10 border-b border-line-row px-3 text-small-strong whitespace-nowrap text-ink',
                      i === 0 ? 'text-left' : 'text-right',
                    )}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={String(row[0])}>
                  {row.map((value, i) =>
                    i === 0 ? (
                      <th
                        key={data.columns[i]}
                        scope="row"
                        className="h-10 border-b border-line-row px-3 text-left font-normal whitespace-nowrap"
                      >
                        {value}
                      </th>
                    ) : (
                      <td
                        key={data.columns[i]}
                        className="h-10 border-b border-line-row px-3 text-right whitespace-nowrap"
                      >
                        {typeof value === 'number' ? formatNumber(value) : value}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
