'use client';

import type * as React from 'react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Meter,
  MeterLabel,
  MeterValue,
  Progress,
  ProgressLabel,
  ProgressValue,
} from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatCompact } from '@/lib/format';

// TEMPORARY: the interactive half of the dev-only primitives gallery (page.tsx); delete with it.

const RANGES = ['7', '30', '90'] as const;
type Range = (typeof RANGES)[number];

// Sample data from a formula, so the server and the browser render the same rows.
const DAY = 86_400_000;
const START = Date.UTC(2026, 6, 14);
const FOLLOWERS = Array.from({ length: 90 }, (_, i) => ({
  day: new Date(START + i * DAY).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }),
  instagram: Math.round(48_000 + i * 140 + Math.sin(i / 4) * 600),
  youtube: Math.round(21_000 + i * 95 + Math.cos(i / 5) * 400),
  tiktok: Math.round(12_500 + i * 210 + Math.sin(i / 3) * 500),
}));
const SERIES = ['instagram', 'youtube', 'tiktok'] as const;

const followersConfig = {
  instagram: { label: 'Instagram', color: 'var(--chart-1)' },
  youtube: { label: 'YouTube', color: 'var(--chart-2)' },
  tiktok: { label: 'TikTok', color: 'var(--chart-3)' },
} satisfies ChartConfig;

const ENGAGEMENT = [
  { day: 'Mon', rate: 3.1 },
  { day: 'Tue', rate: 2.8 },
  { day: 'Wed', rate: 3.4 },
  { day: 'Thu', rate: 3.9 },
  { day: 'Fri', rate: 4.4 },
  { day: 'Sat', rate: 4.9 },
  { day: 'Sun', rate: 5.2 },
];
const engagementConfig = {
  rate: { label: 'Engagement %', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const SCORE_PARTS = [
  { label: 'Completeness', value: 18 },
  { label: 'Reach', value: 12 },
  { label: 'Engagement', value: 15 },
  { label: 'Consistency', value: 6 },
  { label: 'Community', value: 20 },
];
const POLL = [
  { label: 'Lisbon', votes: 46 },
  { label: 'Mexico City', votes: 33 },
  { label: 'Kyoto', votes: 21 },
];
const POLL_TOTAL = POLL.reduce((sum, option) => sum + option.votes, 0);

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-small-strong text-ink-soft">{children}</p>;
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-line bg-white/70 p-4 sm:p-6 ${className ?? ''}`}>
      {children}
    </div>
  );
}

/** One choice that never goes empty: a press on the pressed item sends [], which is ignored. */
function RangeToggle({ value, onChange }: { value: Range; onChange: (next: Range) => void }) {
  return (
    <ToggleGroup
      aria-label="Range"
      value={[value]}
      onValueChange={(next) => {
        if (next[0]) onChange(next[0]);
      }}
    >
      {RANGES.map((range) => (
        <ToggleGroupItem key={range} value={range}>
          {range} days
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function RangeToggleDemo() {
  const [days, setDays] = useState<Range>('30');
  return (
    <div className="flex flex-wrap items-center gap-4">
      <RangeToggle value={days} onChange={setDays} />
      <p className="text-small text-ink-soft">Showing the last {days} days</p>
    </div>
  );
}

export function ProgressDemos() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="flex flex-col gap-5">
        <Caption>Progress: a task moving to done (empty, partway, complete)</Caption>
        <Progress value={0}>
          <ProgressLabel>Importing fans</ProgressLabel>
          <ProgressValue />
        </Progress>
        <Progress value={40}>
          <ProgressLabel>Fetching platforms</ProgressLabel>
          <ProgressValue>{() => '2 of 5'}</ProgressValue>
        </Progress>
        <Progress value={100}>
          <ProgressLabel>Caption draft</ProgressLabel>
          <ProgressValue>{() => 'Done'}</ProgressValue>
        </Progress>
      </Card>
      <Card className="flex flex-col gap-5">
        <Caption>Meter: profile score parts, out of 20 each</Caption>
        {SCORE_PARTS.map((part) => (
          <Meter
            key={part.label}
            value={part.value}
            max={20}
            getAriaValueText={(_, value) => `${value} of 20`}
          >
            <MeterLabel>{part.label}</MeterLabel>
            <MeterValue>{(_, value) => `${value} / 20`}</MeterValue>
          </Meter>
        ))}
      </Card>
      <Card className="flex flex-col gap-5">
        <Caption>Meter: poll results after voting</Caption>
        <p className="text-label-strong text-ink">Where should the next meetup be?</p>
        {POLL.map((option) => (
          <Meter key={option.label} value={option.votes} max={POLL_TOTAL} locale="en-US">
            <MeterLabel>{option.label}</MeterLabel>
            <MeterValue />
          </Meter>
        ))}
        <p className="text-small text-ink-muted">{POLL_TOTAL} votes · closes Friday</p>
      </Card>
    </div>
  );
}

export function ChartDemos() {
  const [days, setDays] = useState<Range>('30');
  const rows = FOLLOWERS.slice(-Number(days));

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="glass min-w-0 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-h2 text-ink">Followers</p>
          <RangeToggle value={days} onChange={setDays} />
        </div>
        <Caption>Line chart, keyboard layer on (Tab to it, arrows move the tooltip)</Caption>
        <ChartContainer config={followersConfig} className="aspect-auto h-72 w-full">
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value) => formatCompact(Number(value))}
            />
            <ChartTooltip
              defaultIndex={Math.floor(rows.length * 0.6)}
              content={<ChartTooltipContent />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            {SERIES.map((key) => (
              <Line
                key={key}
                dataKey={key}
                type="monotone"
                stroke={`var(--color-${key})`}
                strokeWidth={2.5}
                dot={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </div>
      <div className="glass min-w-0 p-4 sm:p-6">
        <p className="mb-4 font-display text-h2 text-ink">Best day to post</p>
        <Caption>Bar chart named as one image (role img, keyboard layer off)</Caption>
        <ChartContainer
          config={engagementConfig}
          role="img"
          aria-label="Engagement rate by weekday, highest on Sunday at 5.2%"
          className="aspect-auto h-56 w-full"
        >
          <BarChart data={ENGAGEMENT} accessibilityLayer={false}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Bar dataKey="rate" fill="var(--color-rate)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
