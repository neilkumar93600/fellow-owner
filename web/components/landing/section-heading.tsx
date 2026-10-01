import type * as React from 'react';
import { cn } from '@/lib/utils';
import { Reveal } from './reveal';

/** Eyebrow chip + display title + lead line, shared by every landing section. */
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
        'flex flex-col gap-5',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 id={id} className="max-w-[18ch] text-section text-ink text-balance">
        {title}
      </h2>
      {lead ? <p className="max-w-[56ch] text-lead text-ink-muted text-pretty">{lead}</p> : null}
    </Reveal>
  );
}
