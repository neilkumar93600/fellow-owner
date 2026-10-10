'use client';

import { Lock } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/components/ui/cn';

interface FrameProps {
  children: ReactNode;
  className?: string;
  /** Zoom on the screen's content: 0.5 lays the UI out twice as wide as the screen and shows it at half size. Default 1. */
  scale?: number;
  /**
   * Lay the content out this many CSS px wide and zoom it to fit the screen, measured (ResizeObserver).
   * `scale` is the first-paint guess until then.
   */
  designWidth?: number;
  /** Rotation in degrees (the hero tilts the browser -2). */
  tilt?: number;
  /** Classes for the screen: its shape (aspect ratio by default) and background. */
  screenClassName?: string;
}

/**
 * The screen: clips real product UI and shows it smaller with CSS zoom (layout zoom, so text wraps and
 * images fill as they would on a wide page; transform: scale would leave the layout box full size).
 */
function Screen({
  children,
  scale = 1,
  designWidth,
  className,
}: Pick<FrameProps, 'children' | 'scale' | 'designWidth'> & {
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!designWidth || !element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0) setFit(entry.contentRect.width / designWidth);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [designWidth]);

  return (
    <div ref={ref} className={cn('relative overflow-hidden bg-cream', className)}>
      <div style={{ zoom: (designWidth && fit) || scale, width: designWidth }}>{children}</div>
    </div>
  );
}

/**
 * A light glass browser window (DESIGN.md glass-strong chrome): three quiet dots, a URL pill with a lock,
 * then the screen. Decorative: callers that put real controls inside wrap it in inert + aria-hidden.
 */
export function BrowserFrame({
  url,
  children,
  className,
  scale,
  designWidth,
  tilt,
  screenClassName,
}: FrameProps & { url: string }) {
  return (
    <div
      className={cn('glass-strong flex flex-col rounded-[22px] p-1.5', className)}
      style={tilt ? { rotate: `${tilt}deg` } : undefined}
    >
      <div className="flex h-8 shrink-0 items-center gap-3 px-2.5">
        <span aria-hidden="true" className="flex w-10 gap-1.5">
          <span className="size-2.5 rounded-full bg-ink/15" />
          <span className="size-2.5 rounded-full bg-ink/15" />
          <span className="size-2.5 rounded-full bg-ink/15" />
        </span>
        <span className="glass-chip mx-auto flex h-6 min-w-0 items-center gap-1.5 px-3 text-caption font-normal text-ink-soft">
          <Lock aria-hidden="true" strokeWidth={1.75} className="size-3 shrink-0" />
          <span className="truncate">{url}</span>
        </span>
        <span aria-hidden="true" className="w-10" />
      </div>
      <Screen
        scale={scale}
        designWidth={designWidth}
        className={cn('aspect-[16/10] rounded-[16px]', screenClassName)}
      >
        {children}
      </Screen>
    </div>
  );
}

/** A light glass phone: a frosted bezel, a 9:19.5 screen and the island. Same props as BrowserFrame, minus the URL. */
export function PhoneFrame({
  children,
  className,
  scale,
  designWidth,
  tilt,
  screenClassName,
}: FrameProps) {
  return (
    <div
      className={cn('glass-strong relative rounded-[44px] p-2', className)}
      style={tilt ? { rotate: `${tilt}deg` } : undefined}
    >
      <Screen
        scale={scale}
        designWidth={designWidth}
        className={cn('aspect-[9/19.5] rounded-[36px]', screenClassName)}
      >
        {children}
      </Screen>
      <span
        aria-hidden="true"
        className="absolute top-[3%] left-1/2 h-[2.6%] w-[30%] -translate-x-1/2 rounded-full bg-ink/85"
      />
    </div>
  );
}
