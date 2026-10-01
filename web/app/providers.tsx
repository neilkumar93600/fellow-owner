'use client';

import { ReactLenis } from 'lenis/react';
import { MotionConfig } from 'motion/react';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { usePrefersReducedMotion } from '@/hooks/use-media-query';

function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|Chromium|Android/.test(ua);
}

/** Lenis smooth scroll: Safari gets a higher lerp and no syncTouch; reduced motion gets native scroll. */
function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const [safari, setSafari] = useState(false);
  useEffect(() => setSafari(isSafari()), []);

  if (reduced) return <>{children}</>;
  return (
    <ReactLenis
      root
      options={{
        lerp: safari ? 0.1 : 0.085,
        smoothWheel: true,
        syncTouch: false,
        anchors: { offset: -16 },
      }}
    >
      {children}
    </ReactLenis>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <SmoothScroll>{children}</SmoothScroll>
      </MotionConfig>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'var(--card-strong)',
            color: 'var(--ink)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            fontFamily: 'var(--font-sans)',
          },
        }}
      />
    </ThemeProvider>
  );
}
