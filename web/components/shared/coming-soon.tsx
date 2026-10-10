import Link from 'next/link';
import { Logo } from '@/components/shared/logo';

/** Temporary page for routes that are specified in 03-app-flow but not built yet. */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <main id="main" className="grid min-h-svh place-items-center p-4 sm:p-6">
      <section className="glass-strong flex w-full max-w-2xl flex-col items-center px-6 py-16 text-center sm:px-12">
        <Link href="/" aria-label="Fellow Owners home" className="mb-10">
          <Logo />
        </Link>
        <p className="eyebrow mb-5">Coming soon</p>
        <h1 className="font-display text-[2.5rem] leading-[1.1] text-ink">{title}</h1>
        <p className="mt-3 max-w-[48ch] text-body text-ink-soft">{description}</p>
        <Link href="/" className="btn btn-secondary mt-8">
          Back home
        </Link>
      </section>
    </main>
  );
}
