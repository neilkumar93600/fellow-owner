'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Iphone } from '@/components/magicui/iphone';
import { Safari } from '@/components/magicui/safari';

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
 * The screen's content, shown smaller with CSS zoom (layout zoom, so text wraps and images fill as they
 * would on a wide page; transform: scale would leave the layout box full size). With a design width the
 * outer box is measured; without one the zoomed block is the screen's own child, so a screen laid out as
 * a grid (loop-static) still centres it.
 */
function Zoom({
  children,
  scale = 1,
  designWidth,
}: Pick<FrameProps, 'children' | 'scale' | 'designWidth'>) {
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

  const zoomed = (
    <div style={{ zoom: (designWidth && fit) || scale, width: designWidth }}>{children}</div>
  );
  return designWidth ? (
    <div ref={ref} className="w-full">
      {zoomed}
    </div>
  ) : (
    zoomed
  );
}

/**
 * A Safari window (Magic UI, components/magicui/safari) with real product UI on its screen. Decorative:
 * callers that put real controls inside wrap it in inert + aria-hidden.
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
    <Safari
      url={url}
      className={className}
      screenClassName={screenClassName}
      style={tilt ? { rotate: `${tilt}deg` } : undefined}
    >
      <Zoom scale={scale} designWidth={designWidth}>
        {children}
      </Zoom>
    </Safari>
  );
}

/** An iPhone (Magic UI, components/magicui/iphone) with real product UI on its screen. Same props as BrowserFrame, minus the URL. */
export function PhoneFrame({
  children,
  className,
  scale,
  designWidth,
  tilt,
  screenClassName,
}: FrameProps) {
  return (
    <Iphone
      className={className}
      screenClassName={screenClassName}
      style={tilt ? { rotate: `${tilt}deg` } : undefined}
    >
      <Zoom scale={scale} designWidth={designWidth}>
        {children}
      </Zoom>
    </Iphone>
  );
}
