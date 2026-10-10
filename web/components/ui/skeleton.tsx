import type * as React from 'react';
import { cn } from './cn';

/**
 * A Dove Grey block with a soft band sweeping across every 1.6s (static under reduced motion). Give it
 * the exact size and radius of what it stands for, so nothing jumps when the data arrives; it defaults to
 * a pill, the shape of a line of text. Hidden from screen readers: mark the loading region aria-busy.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div aria-hidden="true" className={cn('skeleton rounded-full', className)} {...props} />;
}
