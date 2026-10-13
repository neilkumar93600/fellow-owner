import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from './cn';

/**
 * Alert: a strong frosted glass card (72%) with an Ash hairline, radius 24, and a 20px Lucide icon that
 * carries the tone. No saturated fill: words stay ink and graphite.
 * - `default`, a Lake Blue icon: information ("Reminder at 6:00 PM", "Forwarding is not set up yet").
 * - `warning`, an amber icon: something is limited ("AI drafts are unavailable right now").
 * - `destructive`, a red icon and deep red title: something failed or is blocked.
 *
 * <Alert variant="warning">
 *   <Sparkles aria-hidden="true" />
 *   <AlertTitle>AI drafts are paused</AlertTitle>
 *   <AlertDescription>Write the caption yourself; drafts come back tomorrow.</AlertDescription>
 *   <AlertAction><Button variant="secondary" size="md">Try again</Button></AlertAction>
 * </Alert>
 *
 * The role is `status` (polite), or `alert` for `destructive`; pass `role` to change it. No client
 * directive, so server pages render it.
 */
const alertVariants = cva(
  [
    'group/alert glass-strong relative grid w-full content-start items-start gap-y-1 rounded-2xl px-4 py-3.5 text-left text-small text-ink',
    'has-[>svg]:grid-cols-[1.25rem_minmax(0,1fr)] has-[>svg]:gap-x-3',
    '[&>svg]:row-span-2 [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:stroke-[1.5]',
  ],
  {
    variants: {
      variant: {
        default: '[&>svg]:text-lake',
        warning: '[&>svg]:text-warn-ink',
        destructive: '[&>svg]:text-danger *:data-[slot=alert-title]:text-danger-deep',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export type AlertProps = React.ComponentProps<'div'> & VariantProps<typeof alertVariants>;

export function Alert({ className, variant, role, ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      role={role ?? (variant === 'destructive' ? 'alert' : 'status')}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

/** Mono ink at weight 500: one short line. */
export function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn('font-medium text-ink group-has-[>svg]/alert:col-start-2', className)}
      {...props}
    />
  );
}

/** Graphite under the title; links in it are ink and underlined. */
export function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'text-ink-soft group-has-[>svg]/alert:col-start-2 [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-3 [&_p+p]:mt-2',
        className,
      )}
      {...props}
    />
  );
}

/** Buttons or links under the words, aligned with them (never over them at 390px). */
export function AlertAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        'mt-2 flex flex-wrap items-center gap-2 group-has-[>svg]/alert:col-start-2',
        className,
      )}
      {...props}
    />
  );
}
