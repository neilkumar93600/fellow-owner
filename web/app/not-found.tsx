import type { Metadata } from 'next';
import Link from 'next/link';
import { CreatorImage } from '@/components/shared/creator-image';
import { Logo } from '@/components/shared/logo';
import { buttonVariants } from '@/components/ui/button-variants';
import { DISPLAY_H1 } from '@/lib/constants';
import { routes } from '@/lib/routes';

export const metadata: Metadata = { title: 'Page not found' };

/**
 * The 404: a frosted glass panel on the page aurora (the root layout paints it), with a Lisbon street
 * from the demo creator's vlog and a serif headline.
 */
export default function NotFound() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="grid min-h-svh place-items-center p-4 outline-none sm:p-6"
    >
      <div className="glass-strong flex w-full max-w-[640px] flex-col items-center px-6 py-12 text-center sm:px-12 sm:py-16">
        <Logo />
        <CreatorImage
          name="vlog-lisbon"
          alt="A steep cobbled street in Lisbon at golden hour"
          sizes="(min-width: 640px) 440px, 90vw"
          className="mt-8 max-w-[440px] rounded-3xl"
        />
        <h1 className={`${DISPLAY_H1} mt-8`}>
          This page took a <em>wrong turn</em>.
        </h1>
        <p className="mt-3 max-w-[46ch] text-body text-ink">
          The link may be old, or the space may have a new handle. Head back to the start, or open a
          space of your own.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link href={routes.home()} className={buttonVariants()}>
            Back to the start
          </Link>
          <Link
            href={routes.auth.createAccount(routes.onboarding())}
            className={buttonVariants({ variant: 'secondary', surface: 'glass' })}
          >
            Start your own space
          </Link>
        </div>
      </div>
    </main>
  );
}
