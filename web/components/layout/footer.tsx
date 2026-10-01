'use client';

import { useLenis } from 'lenis/react';
import { ArrowUp } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { DemoButton } from '@/components/landing/demo-button';
import styles from '@/components/landing/footer.module.css';
import { useSectionLink } from '@/components/landing/nav-scroll';
import { Logo } from '@/components/shared/logo';
import { isMarketingPath, LANDING_NAV } from '@/lib/constants';
import { cn } from '@/lib/utils';

type FooterLink = { href: string; label: string };

const COMPANY: FooterLink[] = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/pricing', label: 'Pricing' },
];

const LEGAL: FooterLink[] = [
  { href: '/privacy-policy', label: 'Privacy policy' },
  { href: '/terms', label: 'Terms' },
  { href: '/cookies', label: 'Cookies' },
];

const START_HREF = '/login?returnTo=/onboarding';

/** Marketing footer: giant wordmark band, link grid, bottom row. Renders only on marketing paths. */
export function Footer() {
  const pathname = usePathname();
  if (!isMarketingPath(pathname)) return null;
  return <SiteFooter />;
}

function SiteFooter() {
  const bandRef = useReveal<HTMLDivElement>();
  const gridRef = useReveal<HTMLDivElement>();
  const goTo = useSectionLink();
  const lenis = useLenis();

  function backToTop() {
    if (lenis) lenis.scrollTo(0);
    else window.scrollTo({ top: 0 });
    const heading = document.querySelector<HTMLElement>('#main h1');
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.bandWrap}>
        <div ref={bandRef} className={cn(styles.band, styles.reveal)}>
          <div className={styles.bandTop}>
            <p className={cn(styles.tagline, styles.rv)}>
              <span>Turn followers</span> <span>into fellow owners.</span>
            </p>
            <button
              type="button"
              className={cn(styles.toTop, styles.rv)}
              style={delay(80)}
              aria-label="Back to top"
              onClick={backToTop}
            >
              <ArrowUp aria-hidden="true" size={20} strokeWidth={1.5} />
            </button>
          </div>
          {/* The name is also given as text below (logo link and copyright), so this is decoration. */}
          <p aria-hidden="true" className={styles.wordmark}>
            <span className={styles.line} style={delay(60)}>
              Fellow
            </span>
            <span className={styles.line} style={delay(160)}>
              Owners
            </span>
          </p>
        </div>
      </div>

      <div className={styles.inner}>
        <div ref={gridRef} className={cn(styles.grid, styles.reveal)}>
          <div className={cn(styles.intro, styles.rv)}>
            <Link
              href="/"
              aria-label="Fellow Owners home"
              className={styles.home}
              onClick={(event) => goTo(event, '/')}
            >
              <Logo />
            </Link>
            <p className={styles.introCopy}>
              One link in your bio. Followers sort into communities, an AI version of you surfaces
              what deserves your time, and you back what they build.
            </p>
          </div>

          <nav id="site-footer-nav" aria-label="Footer" className={styles.columns}>
            <Column title="Product" index={1}>
              {LANDING_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={styles.flink}
                    onClick={(event) => goTo(event, item.href)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </Column>
            <Column title="Try it" index={2}>
              <li>
                <DemoButton as="creator" className={styles.flink} />
              </li>
              <li>
                <DemoButton as="fan" variant="secondary" className={styles.flink} />
              </li>
              <li>
                <Link href={START_HREF} className={styles.flink}>
                  Start your space
                </Link>
              </li>
            </Column>
            <Column title="Company" index={3}>
              <LinkItems links={COMPANY} />
            </Column>
            <Column title="Legal" index={4}>
              <LinkItems links={LEGAL} />
            </Column>
          </nav>
        </div>

        <div className={styles.bottom}>
          <p>© 2026 Fellow Owners</p>
          <p>Made for creators and the people who follow them.</p>
        </div>
      </div>
    </footer>
  );
}

function Column({
  title,
  index,
  children,
}: {
  title: string;
  index: number;
  children: React.ReactNode;
}) {
  const id = `footer-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className={styles.rv} style={delay(index * 70)}>
      <h2 id={id} className={styles.heading}>
        {title}
      </h2>
      <ul aria-labelledby={id} className={styles.list}>
        {children}
      </ul>
    </div>
  );
}

function LinkItems({ links }: { links: FooterLink[] }) {
  return links.map((link) => (
    <li key={link.href}>
      <Link href={link.href} className={styles.flink}>
        {link.label}
      </Link>
    </li>
  ));
}

function delay(ms: number) {
  return { '--d': `${ms}ms` } as React.CSSProperties;
}

/**
 * Arms a fade-and-rise for a block that starts below the fold, then plays it once when it scrolls in.
 * Without JS, with reduced motion, or when already in view, nothing is hidden.
 */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.dataset.reveal = 'armed';
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        el.dataset.reveal = 'shown';
        observer.disconnect();
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}
