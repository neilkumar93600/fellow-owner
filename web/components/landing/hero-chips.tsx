'use client';

import {
  animate,
  type MotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { cn } from '@/lib/utils';
import styles from './hero.module.css';
import { getIntroState, INTRO_PLAY_EVENT } from './hero-intro';

/** Seconds after the intro starts playing that the first layer lands, then one every STAGGER. */
const FIRST = 0.55;
const STAGGER = 0.12;

interface HeroMotionValue {
  sx: MotionValue<number>;
  sy: MotionValue<number>;
  register: (order: number) => (el: HTMLDivElement | null) => void;
}

const HeroMotionContext = createContext<HeroMotionValue | null>(null);

/**
 * The hero stage's motion: every HeroLayer inside springs in by its `order` once the intro plays, then
 * drifts a little with the pointer at its own depth, so the layers separate. Under reduced motion, on
 * touch screens and after a soft navigation the layers simply sit still.
 */
export function HeroMotion({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 50, damping: 18 });
  const sy = useSpring(py, { stiffness: 50, damping: 18 });
  const layers = useRef(new Map<number, HTMLDivElement>());

  // Pointer drift: fine pointers only, and never under reduced motion.
  useEffect(() => {
    if (reduce || !window.matchMedia('(pointer: fine)').matches) return;
    const onMove = (event: PointerEvent) => {
      px.set(event.clientX / window.innerWidth - 0.5);
      py.set(event.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduce, px, py]);

  // Entrance: only when the hero intro runs (first load, no reduced motion); the CSS hides the layers until then.
  useEffect(() => {
    const state = getIntroState();
    if (state.phase === 'none') return;
    const controls: { stop: () => void }[] = [];
    const run = (playedAt: number) => {
      const elapsed = (performance.now() - playedAt) / 1000;
      for (const [order, el] of layers.current) {
        controls.push(
          animate(
            el,
            { opacity: [0, 1], y: [24, 0], scale: [0.94, 1] },
            {
              type: 'spring',
              stiffness: 220,
              damping: 20,
              delay: Math.max(0, FIRST + order * STAGGER - elapsed),
            },
          ),
        );
      }
    };
    const onPlay = () => run(performance.now());
    if (state.phase === 'playing') run(state.at);
    else window.addEventListener(INTRO_PLAY_EVENT, onPlay, { once: true });
    return () => {
      window.removeEventListener(INTRO_PLAY_EVENT, onPlay);
      for (const control of controls) control.stop();
    };
  }, []);

  const register = useCallback(
    (order: number) => (el: HTMLDivElement | null) => {
      if (el) layers.current.set(order, el);
      else layers.current.delete(order);
    },
    [],
  );

  return (
    <HeroMotionContext.Provider value={{ sx, sy, register }}>{children}</HeroMotionContext.Provider>
  );
}

/**
 * One floating layer: the outer element drifts with the pointer (`depth` px at the viewport edge), the
 * inner one runs the entrance spring.
 */
export function HeroLayer({
  depth,
  order,
  className,
  innerClassName,
  style,
  children,
}: {
  depth: number;
  order: number;
  className?: string;
  innerClassName?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ctx = useContext(HeroMotionContext);
  if (!ctx) throw new Error('HeroLayer must sit inside HeroMotion');
  const x = useTransform(ctx.sx, (value) => value * depth);
  const y = useTransform(ctx.sy, (value) => value * depth);
  return (
    <motion.div className={cn(styles.layer, className)} style={{ ...style, x, y }}>
      <div ref={ctx.register(order)} className={cn(styles.pop, innerClassName)}>
        {children}
      </div>
    </motion.div>
  );
}
