import { Info, type LucideIcon } from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/components/ui/cn';

export interface BannerProps {
  children: React.ReactNode;
  /** A 20px Lucide icon; Info by default (CirclePause for "AI paused"). */
  icon?: LucideIcon;
  className?: string;
}

/**
 * Banner: a pale gold band with a hairline and 16px corners at the top of content and mono amber words, as in
 * "AI paused until tomorrow. New items will be analyzed then."
 */
export function Banner({ children, icon: Icon = Info, className }: BannerProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-line bg-warn-bg px-4 py-3 text-small text-warn-ink',
        className,
      )}
    >
      <Icon aria-hidden="true" strokeWidth={1.5} className="mt-px size-5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
