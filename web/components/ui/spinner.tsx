import { LoaderCircle } from 'lucide-react';
import type * as React from 'react';
import { cn } from './cn';

/**
 * 16px arc in the current color, turning once a second; static under reduced motion (the arc alone
 * still reads as busy). Decorative by default: the busy control says so with aria-busy.
 */
export function Spinner({
  className,
  'aria-hidden': ariaHidden = true,
  ...props
}: React.ComponentProps<typeof LoaderCircle>) {
  return (
    <LoaderCircle
      aria-hidden={ariaHidden}
      strokeWidth={1.5}
      className={cn(
        'size-4 shrink-0 animate-spin motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}
