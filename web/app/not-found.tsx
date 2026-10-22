import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import pill from '@/components/landing/pill.module.css';
import { Logo } from '@/components/shared/logo';
import { buttonVariants } from '@/components/ui/button-variants';
import { DISPLAY_H1 } from '@/lib/constants';
import { routes } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';
import { cn } from '@/lib/utils';
import s from './not-found.module.css';

// The default share card: a missing creator page must not point at its (missing) creator card.
export const metadata: Metadata = pageMetadata({ title: 'Page not found' });

/**
 * The 404: one centred poster. A huge soft-white "404" on peach, periwinkle and mint washes, the lost fan (a
 * puzzled mascot holding its map) standing in front of the middle "0", and the heading, line and buttons
 * centred right under it (buttons stacked on phones). Next sends the 404 status and noindex.
 */
export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className={cn(s.page, 'outline-none')}>
      <div aria-hidden="true" className={s.washes} />

      <Link href={routes.home()} className={s.home}>
        <Logo />
      </Link>

      <div className={s.stage}>
        <div aria-hidden="true" className={s.art}>
          <span className={s.num}>404</span>
          <div className={s.figure}>
            <Image
              src="/creator/lost-fan.webp"
              alt=""
              width={536}
              height={900}
              preload
              sizes="(min-width: 640px) 280px, 110px"
              className={s.fan}
            />
          </div>
        </div>

        <div className={s.copy}>
          <h1 className={cn(DISPLAY_H1, 'text-balance', s.title)}>
            This page took a <em>wrong turn</em>.
          </h1>
          <p className={cn('mt-3 max-w-[56ch]', s.lede)}>
            The link may be old, or the space may have a new handle. Head back to the start, or open
            a space of your own.
          </p>
          <div className={s.actions}>
            <Link href={routes.home()} className={cn(buttonVariants(), pill.primary, s.primary)}>
              <span aria-hidden="true" className={s.arrow}>
                <ArrowLeft className="size-4" />
              </span>
              Back to the start
            </Link>
            <Link
              href={routes.auth.createAccount(routes.onboarding())}
              className={cn(
                buttonVariants({ variant: 'secondary', surface: 'glass' }),
                pill.secondary,
                s.secondary,
              )}
            >
              Start your own space
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
