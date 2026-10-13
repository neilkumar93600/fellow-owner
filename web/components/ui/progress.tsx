'use client';

import { Meter as MeterPrimitive } from '@base-ui/react/meter';
import { Progress as ProgressPrimitive } from '@base-ui/react/progress';
import { cn } from './cn';

/*
 * Bars: an 8px Ash track with a Lake Blue fill, rounded ends. The fill eases over 250ms (instant under
 * reduced motion). A label sits top left and the value top right, both mono 13px, the value tabular.
 *
 * Two roles, one look:
 * - Progress (role progressbar) is a task moving to done: "Fetching platforms, 2 of 5".
 * - Meter (role meter) is a measurement in a range: profile score parts, poll results. Prefer it there,
 *   so screen readers do not hear a loading bar.
 *
 * <Meter value={18} max={20} getAriaValueText={(_, v) => `${v} of 20`}>
 *   <MeterLabel>Completeness</MeterLabel>
 *   <MeterValue>{() => '18 / 20'}</MeterValue>
 * </Meter>
 *
 * Without a Label part, name the bar with `aria-label`. The value prints with the visitor's locale by
 * default; pass `format` or a `children` function to MeterValue / ProgressValue to fix the words.
 */

const ROOT = 'flex w-full flex-wrap items-center gap-x-3 gap-y-1.5';
const TRACK = 'relative h-2 w-full overflow-hidden rounded-full bg-ash';
const INDICATOR = 'h-full rounded-full bg-lake transition-[width] duration-250 ease-out-quart';
const LABEL = 'min-w-0 text-small text-ink';
const VALUE = 'ml-auto text-small text-ink-soft';

type WithClassName<P> = Omit<P, 'className'> & { className?: string };

export function Progress({
  className,
  children,
  ...props
}: WithClassName<ProgressPrimitive.Root.Props>) {
  return (
    <ProgressPrimitive.Root data-slot="progress" className={cn(ROOT, className)} {...props}>
      {children}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  );
}

export function ProgressTrack({
  className,
  ...props
}: WithClassName<ProgressPrimitive.Track.Props>) {
  return (
    <ProgressPrimitive.Track
      data-slot="progress-track"
      className={cn(TRACK, className)}
      {...props}
    />
  );
}

export function ProgressIndicator({
  className,
  ...props
}: WithClassName<ProgressPrimitive.Indicator.Props>) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn(INDICATOR, className)}
      {...props}
    />
  );
}

export function ProgressLabel({
  className,
  ...props
}: WithClassName<ProgressPrimitive.Label.Props>) {
  return (
    <ProgressPrimitive.Label
      data-slot="progress-label"
      className={cn(LABEL, className)}
      {...props}
    />
  );
}

export function ProgressValue({
  className,
  ...props
}: WithClassName<ProgressPrimitive.Value.Props>) {
  return (
    <ProgressPrimitive.Value
      data-slot="progress-value"
      className={cn(VALUE, className)}
      {...props}
    />
  );
}

export function Meter({ className, children, ...props }: WithClassName<MeterPrimitive.Root.Props>) {
  return (
    <MeterPrimitive.Root data-slot="meter" className={cn(ROOT, className)} {...props}>
      {children}
      <MeterPrimitive.Track data-slot="meter-track" className={TRACK}>
        <MeterPrimitive.Indicator data-slot="meter-indicator" className={INDICATOR} />
      </MeterPrimitive.Track>
    </MeterPrimitive.Root>
  );
}

export function MeterLabel({ className, ...props }: WithClassName<MeterPrimitive.Label.Props>) {
  return (
    <MeterPrimitive.Label data-slot="meter-label" className={cn(LABEL, className)} {...props} />
  );
}

export function MeterValue({ className, ...props }: WithClassName<MeterPrimitive.Value.Props>) {
  return (
    <MeterPrimitive.Value data-slot="meter-value" className={cn(VALUE, className)} {...props} />
  );
}
