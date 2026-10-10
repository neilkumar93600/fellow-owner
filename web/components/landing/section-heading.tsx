import type * as React from 'react';
import { cn } from '@/lib/utils';
import { Reveal } from './reveal';

/** Eyebrow chip + serif display title + lead line, shared by the landing sections that use it. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  align = 'left',
  className,
}: {
  id?: string;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        'flex flex-col items-start gap-5',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2
        id={id}
        className="max-w-[18ch] font-display text-section font-normal! tracking-[-0.015em]! text-ink text-balance"
      >
        {title}
      </h2>
      {lead ? <p className="max-w-[56ch] text-lead text-ink-soft text-pretty">{lead}</p> : null}
    </Reveal>
  );
}
