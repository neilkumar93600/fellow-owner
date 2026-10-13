import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from './cn';

/**
 * Badge (DESIGN.md tags and status pill): a 24px hairline Ash pill, mono 12px caps with tight tracking,
 * ink words on a pale tint and never bare colour. The tone says where a thing stands, as StatusPill does:
 * - `neutral` at rest: a platform, "Planned", "Archived".
 * - `cool` moved forward: "Shortlisted", "Backed by Mira".
 * - `warm` waits on someone: "New", "Feedback wanted", "Reminded".
 * - `success` done: "Posted", "Accepted".
 * - `warning` needs a look: "Sample data", an AI flag (amber words, 4.7:1).
 * - `destructive` a risk: "Spam" (deep red words on a pale red, 4.9:1).
 *
 * A 14px icon may lead: `<Badge variant="cool"><Check aria-hidden="true" />Backed by Mira</Badge>`.
 * No client directive, so server pages (the media kit) render it. It is a label, not a control: a
 * pressable chip is a Button or a ToggleGroupItem.
 */
export const badgeVariants = cva(
  [
    'inline-flex h-6 w-fit max-w-full shrink-0 items-center gap-1.5 overflow-hidden rounded-full border border-line px-2.5 text-caption tracking-tight whitespace-nowrap uppercase',
    '[&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:stroke-[1.5]',
  ],
  {
    variants: {
      variant: {
        neutral: 'bg-white/75 text-ink',
        cool: 'bg-periwinkle text-ink',
        warm: 'bg-aurora-peach text-ink',
        success: 'bg-aurora-mint text-ink',
        warning: 'bg-warn-bg text-warn-ink',
        // An opaque mix, so the words keep 4.9:1 over any wash.
        destructive: 'bg-[color-mix(in_srgb,var(--danger)_10%,white)] text-danger-deep',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export type BadgeProps = React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
