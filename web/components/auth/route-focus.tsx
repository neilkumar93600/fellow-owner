'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * After a move between auth screens, focus that fell to <body> (touch browsers drop it with the
 * unmounted form) goes to #main, so the next swipe or Tab starts in the new screen. Focus a form placed
 * itself is left alone, and nothing happens on the first load.
 */
export function RouteFocus() {
  const pathname = usePathname();
  const last = useRef(pathname);

  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}
