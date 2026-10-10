'use client';

import {
  CartesianGrid,
  LineChart as Chart,
  Line,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/components/ui/cn';
import { formatCompact, formatDate, formatNumber } from '@/lib/format';

/** How axis and tooltip values print. Names, not functions, so a server page can pass them. */
export type ChartFormat = 'date' | 'number' | 'compact';

const FORMAT: Record<ChartFormat, (value: unknown) => string> = {
  date: (value) => formatDate(String(value)),
  number: (value) => formatNumber(Number(value)),
  compact: (value) => formatCompact(Number(value)),
};

const AXIS_TICK = { fill: 'var(--ink-soft)', fontSize: 13 };

export interface LineChartProps<Row extends object> {
  data: Row[];
  /** Up to three series, stroked in order Marigold, Chart Violet, Lagoon Teal (var(--chart-1..3)). */
  series: { key: Extract<keyof Row, string>; label: string }[];
  xKey: Extract<keyof Row, string>;
  /** Raw x values when left out. */
  xFormat?: ChartFormat;
  yFormat?: ChartFormat;
  height?: number;
  /** What the chart shows, read as its image name; the card's summary and data table carry the values. */
  label: string;
  className?: string;
}

/**
 * DESIGN.md line chart: monotone 2.5px strokes with no area, faint vertical grid lines, Small ink-soft
 * tabular axis labels. Hover draws a 1px Fog Grey guide and a 28px glass chip with the figures. Recharts
 * skips the draw-in animation under reduced motion (its default "auto").
 */
export function LineChart<Row extends object>({
  data,
  series,
  xKey,
  xFormat,
  yFormat = 'compact',
  height = 280,
  label,
  className,
}: LineChartProps<Row>) {
  const formatX = xFormat ? FORMAT[xFormat] : String;
  const formatY = FORMAT[yFormat];

  const pill = ({ active, payload, label: x }: TooltipContentProps) =>
    active && payload?.length ? (
      <div className="flex h-7 items-center gap-3 glass-chip px-3 whitespace-nowrap text-ink">
        <span className="text-small">{formatX(x)}</span>
        {payload.map((item) => (
          <span
            key={String(item.dataKey)}
            className="flex items-center gap-1.5 text-label tabular-nums"
          >
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {formatY(item.value)}
          </span>
        ))}
      </div>
    ) : null;

  return (
    <div
      role="img"
      aria-label={label}
      className={cn('w-full tabular-nums', className)}
      style={{ height }}
    >
      <Chart
        data={data}
        responsive
        accessibilityLayer={false}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        style={{ width: '100%', height: '100%' }}
      >
        <CartesianGrid vertical horizontal={false} syncWithTicks stroke="var(--line)" />
        <XAxis
          dataKey={xKey}
          tickFormatter={(value) => formatX(value)}
          axisLine={false}
          tickLine={false}
          tick={AXIS_TICK}
          tickMargin={12}
          interval="preserveStartEnd"
          minTickGap={16}
          padding={{ left: 12, right: 12 }}
        />
        <YAxis
          tickFormatter={(value) => formatY(value)}
          axisLine={false}
          tickLine={false}
          tick={AXIS_TICK}
          width={44}
          allowDecimals={false}
        />
        <Tooltip
          content={pill}
          cursor={{ stroke: 'var(--ink-faint)', strokeWidth: 1 }}
          isAnimationActive={false}
          wrapperStyle={{ outline: 'none' }}
        />
        {series.slice(0, 3).map((s, i) => (
          <Line
            key={s.key}
            dataKey={s.key}
            name={s.label}
            type="monotone"
            stroke={`var(--chart-${i + 1})`}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card-strong)' }}
          />
        ))}
      </Chart>
    </div>
  );
}
