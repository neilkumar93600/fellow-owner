'use client';

import { motion, type Variants } from 'motion/react';
import type * as React from 'react';

const EASE = [0.25, 1, 0.5, 1] as const; // ease-out-quart

const container: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

type Tag = 'div' | 'section' | 'ul' | 'ol' | 'li' | 'header' | 'p' | 'h2' | 'h3' | 'article';

/** Fades and rises its children into view once (16px, 600ms, ease-out-quart). Reduced motion: shown at once. */
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
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: '-80px' }}
      variants={{
        hidden: { opacity: 0, y: 16 },
        shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE, delay } },
      }}
    >
      {children}
    </Component>
  );
}

/** Staggers its RevealItem children (80ms apart). */
export function RevealGroup({
  as = 'div',
  className,
  children,
}: {
  as?: Tag;
  className?: string;
  children: React.ReactNode;
}) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: '-80px' }}
      variants={container}
    >
      {children}
    </Component>
  );
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
  const Component = motion[as];
  return (
    <Component className={className} variants={item}>
      {children}
    </Component>
  );
}
