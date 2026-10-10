import type * as React from 'react';
import { cn } from '@/components/ui/cn';

export interface PageHeadingProps {
  title: React.ReactNode;
  /** One line under the title. */
  description?: React.ReactNode;
  /** 1: the page title in H1 (fan, legal and detail pages); 2: a section head in H2. */
  level?: 1 | 2;
  /** Controls on the right, such as one secondary pill. */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * A page or section title with an optional line and actions. A page title (level 1) is Instrument Serif
 * at 36px; a section head stays Inter H2 (serif only at 28px and up). Words are ink, so they read on the
 * bare aurora as well as on glass.
 */
export function PageHeading({
  title,
  description,
  level = 1,
  actions,
  className,
}: PageHeadingProps) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-x-6 gap-y-3', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <Heading
          className={cn(
            level === 1 ? 'font-display text-[2.25rem] leading-[1.1] font-normal' : 'text-h2',
            'text-ink',
          )}
        >
          {title}
        </Heading>
        {description ? <p className="max-w-[68ch] text-body text-ink">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </div>
  );
}
