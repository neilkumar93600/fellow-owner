'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type * as React from 'react';
import { DemoButton } from '@/components/landing/demo-button';
import styles from '@/components/landing/footer.module.css';
import { useSectionLink } from '@/components/landing/nav-scroll';
import { FooterLandscape } from '@/components/layout/footer-landscape';
import { NewsletterForm } from '@/components/layout/newsletter-form';
import { Logo } from '@/components/shared/logo';
import {
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  XIcon,
  YouTubeIcon,
} from '@/components/shared/social-icons';
import { isMarketingPath, SOCIAL_LINKS } from '@/lib/constants';

type FooterLink = { href: string; label: string };

const PRODUCT: FooterLink[] = [
  { href: '/#one-week', label: 'How it works' },
  { href: '/#creators', label: 'For creators' },
  { href: '/#fans', label: 'For fans' },
  { href: '/pricing', label: 'Pricing' },
];

const COMPANY: FooterLink[] = [
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];

const LEGAL: FooterLink[] = [
  { href: '/privacy-policy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/cookies', label: 'Cookies' },
];

/** Icon per SOCIAL_LINKS name (lib/constants.ts holds the handles). */
const SOCIAL_ICON: Record<
  (typeof SOCIAL_LINKS)[number]['name'],
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  Instagram: InstagramIcon,
  TikTok: TikTokIcon,
  YouTube: YouTubeIcon,
  X: XIcon,
  LinkedIn: LinkedInIcon,
};

/** Marketing footer: brand and link columns, a bottom line, then the golden-hour landscape. */
export function Footer() {
  const pathname = usePathname();
  if (!isMarketingPath(pathname)) return null;
  return <SiteFooter />;
}

function SiteFooter() {
  const goTo = useSectionLink();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.intro}>
            <Link
              href="/"
              aria-label="Fellow Owners home"
              className={styles.home}
              onClick={(event) => goTo(event, '/')}
            >
              <Logo />
            </Link>
            <p className={styles.introCopy}>
              One link in your bio that turns followers into fellow owners.
            </p>
            <NewsletterForm />
            <div className={styles.works}>
              <p id="footer-follow" className={styles.worksLabel}>
                Follow us
              </p>
              <ul aria-labelledby="footer-follow" className={styles.badges}>
                {SOCIAL_LINKS.map((social) => {
                  const Icon = SOCIAL_ICON[social.name];
                  return (
                    <li key={social.name}>
                      <a
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Fellow Owners on ${social.name}`}
                        className={styles.badge}
                      >
                        <Icon className="size-5" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <nav id="site-footer-nav" aria-label="Footer" className={styles.columns}>
            <Column title="Product">
              {PRODUCT.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={styles.flink}
                    onClick={(event) => goTo(event, link.href)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </Column>
            <Column title="Try the demo">
              <li>
                <DemoButton as="creator" variant="secondary" className={styles.flink}>
                  Creator view
                </DemoButton>
              </li>
              <li>
                <DemoButton as="fan" variant="secondary" className={styles.flink}>
                  Fan view
                </DemoButton>
              </li>
              <li>
                <Link href="/mira" className={styles.flink}>
                  Mira&rsquo;s demo page
                </Link>
              </li>
            </Column>
            <Column title="Company">
              <LinkItems links={COMPANY} />
            </Column>
            <Column title="Legal">
              <LinkItems links={LEGAL} />
            </Column>
          </nav>
        </div>

        <div className={styles.bottom}>
          <p>
            Made with{' '}
            <span role="img" aria-label="love" className={styles.heart}>
              &hearts;
            </span>{' '}
            for creators and their fans &copy; 2026 Fellow Owners.
          </p>
          <nav aria-label="Legal" className={styles.legal}>
            {LEGAL.map((link, index) => (
              <span key={link.href} className={styles.legalItem}>
                {index > 0 ? (
                  <span aria-hidden="true" className={styles.dot}>
                    &middot;
                  </span>
                ) : null}
                <Link href={link.href} className={styles.blink}>
                  {link.label}
                </Link>
              </span>
            ))}
          </nav>
        </div>
      </div>

      <FooterLandscape />
    </footer>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  const id = `footer-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div>
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
