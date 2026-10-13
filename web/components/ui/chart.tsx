'use client';

import * as React from 'react';
import type { TooltipValueType } from 'recharts';
import * as RechartsPrimitive from 'recharts';
import { formatNumber } from '@/lib/format';
import { cn } from './cn';

/*
 * Chart (shadcn chart on Recharts 3). `config` names each series once, with its label and colour, and the
 * container sets that colour as `--color-<key>` for the marks: `<Line dataKey="instagram"
 * stroke="var(--color-instagram)" />`. Colours come from the chart roles: var(--chart-1) Lake Blue,
 * --chart-2 amber, --chart-3 green, --chart-4 violet, --chart-5 stone. Keys name data series (views,
 * instagram); never a theme colour name such as `ink` or `line`, which the variable would shadow.
 *
 * Axis labels are mono 13px graphite with tabular figures, grid lines Ash hairlines. The tooltip is the
 * white overlay of the Tooltip primitive (radius 20, hairline, shadow-overlay) with 10px round swatches;
 * the legend matches ChartCard's (10px dots, mono graphite). Recharts skips the draw-in animation under
 * reduced motion (its `isAnimationActive` default, 'auto'). Keyboard focus on the chart is the global ink
 * ring.
 *
 * Accessible name: a chart is never the only source of a value. Either keep Recharts' keyboard layer
 * (the default) inside a ChartCard whose "Show data" table carries the values, or pass `role="img"` and
 * an `aria-label` here and `accessibilityLayer={false}` on the chart.
 *
 * <ChartContainer config={{ views: { label: 'Views', color: 'var(--chart-1)' } }} className="aspect-auto h-64">
 *   <BarChart data={rows}>
 *     <CartesianGrid vertical={false} />
 *     <XAxis dataKey="day" tickLine={false} axisLine={false} />
 *     <ChartTooltip content={<ChartTooltipContent />} />
 *     <Bar dataKey="views" fill="var(--color-views)" radius={6} />
 *   </BarChart>
 * </ChartContainer>
 */

export type ChartConfig = Record<
  string,
  { label?: React.ReactNode; icon?: React.ComponentType; color?: string }
>;

type ChartContextProps = { config: ChartConfig };

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error('useChart must be used within a <ChartContainer />');
  return context;
}

const INITIAL_DIMENSION = { width: 320, height: 200 } as const;
type TooltipNameType = number | string;

export function ChartContainer({
  className,
  style,
  children,
  config,
  initialDimension = INITIAL_DIMENSION,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
  initialDimension?: { width: number; height: number };
}) {
  // ponytail: series colours as inline custom properties instead of shadcn's injected <style> tag.
  const colors = Object.fromEntries(
    Object.entries(config).flatMap(([key, item]) =>
      item.color ? [[`--color-${key}`, item.color]] : [],
    ),
  ) as React.CSSProperties;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        style={{ ...colors, ...style }}
        className={cn(
          'flex aspect-video justify-center text-small',
          '[&_.recharts-cartesian-axis-tick_text]:fill-ink-soft',
          "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-line",
          '[&_.recharts-curve.recharts-tooltip-cursor]:stroke-ink-faint',
          "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-line",
          '[&_.recharts-radial-bar-background-sector]:fill-ash/40',
          '[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-ink/5',
          "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-line",
          "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
          className,
        )}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer initialDimension={initialDimension}>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = RechartsPrimitive.Tooltip;

export function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<'div'> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: 'line' | 'dot' | 'dashed';
    nameKey?: string;
    labelKey?: string;
  } & Omit<
    RechartsPrimitive.DefaultTooltipContentProps<TooltipValueType, TooltipNameType>,
    'accessibilityLayer'
  >) {
  const { config } = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) return null;
    const [item] = payload;
    const key = `${labelKey ?? item?.dataKey ?? item?.name ?? 'value'}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value =
      !labelKey && typeof label === 'string' ? (config[label]?.label ?? label) : itemConfig?.label;
    if (labelFormatter) {
      return (
        <div className={cn('font-medium text-ink', labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      );
    }
    if (!value) return null;
    return <div className={cn('font-medium text-ink', labelClassName)}>{value}</div>;
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

  if (!active || !payload?.length) return null;

  const nestLabel = payload.length === 1 && indicator !== 'dot';

  return (
    <div
      className={cn(
        'grid min-w-36 items-start gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-small text-ink shadow-overlay',
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload
          .filter((item) => item.type !== 'none')
          .map((item, index) => {
            const key = `${nameKey ?? item.name ?? item.dataKey ?? 'value'}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color ?? item.payload?.fill ?? item.color;

            return (
              <div
                key={`${String(item.dataKey)}:${String(item.name)}`}
                className={cn(
                  'flex w-full flex-wrap items-stretch gap-2 [&>svg]:size-2.5 [&>svg]:text-ink-soft',
                  indicator === 'dot' && 'items-center',
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn(
                            'shrink-0 border-(--color-border) bg-(--color-bg)',
                            indicator === 'dot' && 'size-2.5 rounded-full',
                            indicator === 'line' && 'w-1 rounded-full',
                            indicator === 'dashed' &&
                              'w-0 border-[1.5px] border-dashed bg-transparent',
                            nestLabel && indicator === 'dashed' && 'my-0.5',
                          )}
                          style={
                            {
                              '--color-bg': indicatorColor,
                              '--color-border': indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        'flex flex-1 justify-between gap-4 leading-none',
                        nestLabel ? 'items-end' : 'items-center',
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-ink-soft">{itemConfig?.label ?? item.name}</span>
                      </div>
                      {item.value != null && (
                        <span className="font-medium text-ink tabular-nums">
                          {typeof item.value === 'number'
                            ? formatNumber(item.value)
                            : String(item.value)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

export const ChartLegend = RechartsPrimitive.Legend;

export function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = 'bottom',
  nameKey,
}: React.ComponentProps<'div'> & {
  hideIcon?: boolean;
  nameKey?: string;
} & RechartsPrimitive.DefaultLegendContentProps) {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <ul
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-5 gap-y-1',
        verticalAlign === 'top' ? 'pb-3' : 'pt-3',
        className,
      )}
    >
      {payload
        .filter((item) => item.type !== 'none')
        .map((item) => {
          const key = `${nameKey ?? item.dataKey ?? 'value'}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          return (
            <li
              key={`${String(item.dataKey)}:${String(item.value)}`}
              className="flex items-center gap-2 text-small text-ink-soft [&>svg]:size-3 [&>svg]:text-ink-soft"
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              )}
              {itemConfig?.label}
            </li>
          );
        })}
    </ul>
  );
}

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== 'object' || payload === null) return undefined;

  const payloadPayload =
    'payload' in payload && typeof payload.payload === 'object' && payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;
  if (key in payload && typeof payload[key as keyof typeof payload] === 'string') {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === 'string'
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key];
}
