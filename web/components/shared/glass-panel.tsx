import type * as React from 'react';
import { cn } from '@/components/ui/cn';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'nav';
  /** soft: 55% fill for short text over the aurora. strong: 72% for long text, lists and forms. */
  strength?: 'soft' | 'strong';
  className?: string;
  children: React.ReactNode;
}

/**
 * Glass panel: frosted white over the parchment washes, an ash hairline and a
 * 40px radius. Falls back to 92% white where backdrop-filter is unsupported (globals.css). Padding is
 * the caller's.
 */
export function GlassPanel({
  as: Tag = 'div',
  strength = 'soft',
  className,
  children,
  ...props
}: GlassPanelProps) {
  return (
    <Tag className={cn(strength === 'strong' ? 'glass-strong' : 'glass', className)} {...props}>
      {children}
    </Tag>
  );
}
