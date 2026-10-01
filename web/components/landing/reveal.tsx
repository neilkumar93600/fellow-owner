'use client';

import type * as React from 'react';
import { createElement, useEffect, useRef } from 'react';

type Tag = 'div' | 'section' | 'ul' | 'ol' | 'li' | 'header' | 'p' | 'h2' | 'h3' | 'article';

/**
 * Progressive reveal: the server HTML is always visible (no JavaScript, crawlers, slow hydration).
 * After hydration, elements that start below the fold are hidden and fade + rise 16px into view once
 * (600ms, ease-out-quart; styles in globals.css). Elements already on screen are never hidden.
 * Reduced motion keeps everything shown.
 */
function useReveal(attribute: 'data-reveal' | 'data-reveal-group') {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
      el.setAttribute(attribute, 'shown');
      return;
    }
    el.setAttribute(attribute, 'pending');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        el.setAttribute(attribute, 'shown');
        observer.disconnect();
      },
      { rootMargin: '0px 0px -80px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [attribute]);
  return ref;
}

export function Reveal({
  as = 'div',
  className,
  children,
  delay = 0,
}: {
  as?: Tag;
  className?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useReveal('data-reveal');
  return createElement(
    as,
    {
      ref,
      className,
      'data-reveal': '',
      style: delay ? ({ '--reveal-delay': `${delay}s` } as React.CSSProperties) : undefined,
    },
    children,
  );
}

/** Staggers its direct RevealItem children (80ms apart, by position). */
export function RevealGroup({
  as = 'div',
  className,
  children,
}: {
  as?: Tag;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useReveal('data-reveal-group');
  return createElement(as, { ref, className, 'data-reveal-group': '' }, children);
}

export function RevealItem({
  as = 'div',
  className,
  children,
}: {
  as?: Tag;
  className?: string;
  children: React.ReactNode;
}) {
  return createElement(as, { className, 'data-reveal-item': '' }, children);
}
