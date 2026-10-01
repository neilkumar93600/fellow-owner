'use client';

import { ArrowRight, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type * as React from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DemoButton } from '@/components/landing/demo-button';
import styles from '@/components/landing/nav.module.css';
import { sectionIdFrom, useSectionLink } from '@/components/landing/nav-scroll';
import { Logo } from '@/components/shared/logo';
import { isMarketingPath, LANDING_NAV } from '@/lib/constants';
import { cn } from '@/lib/utils';

/** Scroll distance after which the bar condenses into the floating pill. */
const CONDENSE_AFTER = 24;
const FLIP_MS = 240;
const EASE_OUT_QUART = 'cubic-bezier(0.25, 1, 0.5, 1)';
const SHEET_ID = 'site-menu';
const DESKTOP_QUERY = '(min-width: 1024px)';
const START_HREF = '/login?returnTo=/onboarding';

const SECTION_IDS = LANDING_NAV.map((item) => sectionIdFrom(item.href)).filter((id): id is string =>
  Boolean(id),
);

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Marketing navbar: transparent bar on the hero, floating glass pill after 24px of scroll, lime pill on
 * the section in view, glass menu sheet below 1024px. Renders only on marketing paths.
 */
export function Navbar() {
  const pathname = usePathname();
  if (!isMarketingPath(pathname)) return null;
  return <SiteNav onLanding={pathname === '/'} />;
}

function SiteNav({ onLanding }: { onLanding: boolean }) {
  const { condensed, plateRef, brandRef, linksRef, actionsRef } = useCondensedBar();
  const active = useActiveSection(onLanding);
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const goTo = useSectionLink(close);

  useMenuDismiss(open, close, menuButtonRef, sheetRef);

  return (
    <>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <header className={styles.root} data-condensed={condensed}>
        <div className={styles.bar}>
          <div ref={plateRef} className={styles.plate} aria-hidden="true" />

          <div ref={brandRef} className={styles.brandWrap}>
            <Link
              href="/"
              aria-label="Fellow Owners home"
              className={cn(styles.brand, styles.item)}
              onClick={(event) => goTo(event, '/')}
            >
              <Logo />
            </Link>
          </div>

          <nav ref={linksRef} aria-label="Sections" className={styles.linksWrap}>
            <SectionLinks active={active} onNavigate={goTo} />
          </nav>

          <div ref={actionsRef} className={styles.actions}>
            <DemoButton
              as="fan"
              variant="secondary"
              className={cn(styles.action, styles.fan, styles.item)}
            />
            <DemoButton as="creator" className={cn(styles.action, styles.creator, styles.item)} />
            <button
              ref={menuButtonRef}
              type="button"
              className={cn(styles.menuButton, styles.item)}
              aria-label={open ? 'Close menu' : 'Menu'}
              aria-expanded={open}
              aria-controls={SHEET_ID}
              onClick={() => setOpen((value) => !value)}
            >
              <Menu
                aria-hidden="true"
                className={cn(styles.menuIcon, styles.iconOpen)}
                size={20}
                strokeWidth={1.5}
              />
              <X
                aria-hidden="true"
                className={cn(styles.menuIcon, styles.iconClose)}
                size={20}
                strokeWidth={1.5}
              />
            </button>
          </div>
        </div>

        <div id={SHEET_ID} ref={sheetRef} className={styles.sheet} data-open={open} inert={!open}>
          <nav aria-label="Sections">
            <ul className={styles.sheetList}>
              {LANDING_NAV.map((item, index) => {
                const id = sectionIdFrom(item.href);
                const current = id !== null && id === active;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={styles.sheetLink}
                      aria-current={current ? 'location' : undefined}
                      onClick={(event) => goTo(event, item.href)}
                    >
                      {item.label}
                      <span aria-hidden="true" className={styles.sheetIndex}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className={styles.sheetActions}>
            <DemoButton as="creator" className={styles.sheetButton} />
            <DemoButton as="fan" variant="secondary" className={styles.sheetButton} />
            <Link href={START_HREF} className={styles.sheetStart} onClick={close}>
              Start your space
              <ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

/** Desktop links with one lime pill that slides (clip-path) to the section in view. */
function SectionLinks({
  active,
  onNavigate,
}: {
  active: string | null;
  onNavigate: (event: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const shown = useRef(false);

  const activeRef = useRef(active);

  const place = useCallback((instant: boolean) => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator) return;
    const id = activeRef.current;
    const link = id ? list.querySelector<HTMLElement>(`[data-section="${id}"]`) : null;
    if (!link || link.offsetWidth === 0) {
      indicator.dataset.shown = 'false';
      shown.current = false;
      return;
    }
    const left = link.offsetLeft;
    const right = list.clientWidth - left - link.offsetWidth;
    const clip = `inset(0px ${right}px 0px ${left}px round 999px)`;
    if (instant || !shown.current) {
      // Appear in place (fade only); slide only from one link to another.
      indicator.style.transition = 'none';
      indicator.style.clipPath = clip;
      void indicator.offsetWidth;
      indicator.style.transition = '';
    } else {
      indicator.style.clipPath = clip;
    }
    indicator.dataset.shown = 'true';
    shown.current = true;
  }, []);

  useLayoutEffect(() => {
    activeRef.current = active;
    place(false);
  }, [active, place]);

  // Re-place without sliding when the row changes size (font swap, breakpoint).
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let width = list.offsetWidth;
    const observer = new ResizeObserver(() => {
      if (list.offsetWidth === width) return;
      width = list.offsetWidth;
      place(true);
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, [place]);

  return (
    <div ref={listRef} className={styles.listWrap}>
      <span ref={indicatorRef} aria-hidden="true" className={styles.indicator} data-shown="false" />
      <ul className={styles.list}>
        {LANDING_NAV.map((item) => {
          const id = sectionIdFrom(item.href);
          const current = id !== null && id === active;
          return (
            <li key={item.href} className={cn(styles.linkItem, styles.item)}>
              <Link
                href={item.href}
                data-section={id ?? undefined}
                className={styles.link}
                aria-current={current ? 'location' : undefined}
                onClick={(event) => onNavigate(event, item.href)}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Condenses the bar after 24px of scroll. The new geometry applies at once; brand, links, actions and
 * the glass plate are then FLIPped from where they were, so the change animates with transforms only.
 */
function useCondensedBar() {
  const [condensed, setCondensed] = useState(false);
  const plateRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const current = useRef(false);
  const first = useRef<Map<HTMLElement, DOMRect> | null>(null);
  const running = useRef<Animation[]>([]);

  useEffect(() => {
    let frame = 0;
    const update = (animate: boolean) => {
      frame = 0;
      const next = window.scrollY > CONDENSE_AFTER;
      if (next === current.current) return;
      current.current = next;
      if (animate && !prefersReducedMotion()) {
        const rects = new Map<HTMLElement, DOMRect>();
        for (const el of [
          plateRef.current,
          brandRef.current,
          linksRef.current,
          actionsRef.current,
        ]) {
          if (el) rects.set(el, el.getBoundingClientRect());
        }
        first.current = rects;
      }
      setCondensed(next);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(() => update(true));
    };
    update(false);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the FLIP runs after every condensed change.
  useLayoutEffect(() => {
    const rects = first.current;
    first.current = null;
    if (!rects) return;
    for (const animation of running.current) animation.cancel();
    running.current = [];
    for (const [el, from] of rects) {
      const to = el.getBoundingClientRect();
      if (from.width === 0 || to.width === 0) continue;
      const scales = el === plateRef.current;
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      const sx = scales ? from.width / to.width : 1;
      const sy = scales ? from.height / to.height : 1;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && sx === 1 && sy === 1) continue;
      running.current.push(
        el.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
            { transform: 'translate(0px, 0px) scale(1, 1)' },
          ],
          { duration: FLIP_MS, easing: EASE_OUT_QUART },
        ),
      );
    }
  }, [condensed]);

  return { condensed, plateRef, brandRef, linksRef, actionsRef };
}

/**
 * The landing section under a line at 40% of the viewport, among the LANDING_NAV targets. Sections that
 * are not in the nav (hero, loop, features...) leave nothing highlighted.
 */
function useActiveSection(enabled: boolean): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setActive(null);
      return;
    }
    const inView = new Set<string>();
    const owners = new Map<Element, string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = owners.get(entry.target);
          if (!id) continue;
          if (entry.isIntersecting) inView.add(id);
          else inView.delete(id);
        }
        const next = SECTION_IDS.find((id) => inView.has(id)) ?? null;
        setActive((prev) => (prev === next ? prev : next));
      },
      { rootMargin: '-40% 0px -59% 0px' },
    );

    const attach = () => {
      const attached = new Set(owners.values());
      for (const id of SECTION_IDS) {
        if (attached.has(id)) continue;
        const el = document.getElementById(id);
        if (!el) continue;
        const section = el.closest('section') ?? el;
        owners.set(section, id);
        observer.observe(section);
      }
    };
    attach();
    // Sections render on the server, but retry in case one mounts late.
    const retries = [window.setTimeout(attach, 800), window.setTimeout(attach, 3000)];
    return () => {
      observer.disconnect();
      for (const timer of retries) window.clearTimeout(timer);
    };
  }, [enabled]);

  return active;
}

/** Esc, a click outside, Tab leaving the sheet, or reaching desktop width closes the menu sheet. */
function useMenuDismiss(
  open: boolean,
  close: () => void,
  buttonRef: React.RefObject<HTMLButtonElement | null>,
  sheetRef: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      close();
      buttonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (sheetRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close();
      buttonRef.current?.focus({ preventScroll: true });
    };
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (!next) return;
      if (sheetRef.current?.contains(next) || buttonRef.current?.contains(next)) return;
      close();
    };
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const onWidth = () => {
      if (desktop.matches) close();
    };
    const sheet = sheetRef.current;
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    sheet?.addEventListener('focusout', onFocusOut);
    desktop.addEventListener('change', onWidth);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      sheet?.removeEventListener('focusout', onFocusOut);
      desktop.removeEventListener('change', onWidth);
    };
  }, [open, close, buttonRef, sheetRef]);
}
