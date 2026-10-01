import Link from 'next/link';
import { Logo } from '@/components/shared/logo';

/** Temporary page for routes that are specified in 03-app-flow but not built yet. */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <main id="main" className="grid min-h-svh place-items-center bg-page p-4 sm:p-6">
      <section className="relative isolate flex w-full max-w-2xl flex-col items-center overflow-hidden rounded-shell bg-shell px-6 py-16 text-center sm:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -bottom-24 -z-10 size-80 rounded-full bg-blur-2 opacity-40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-28 -bottom-28 -z-10 size-72 rounded-full bg-blur-3 opacity-40 blur-3xl"
        />
        <Link href="/" aria-label="Fellow Owners home" className="mb-10">
          <Logo />
        </Link>
        <p className="eyebrow mb-5">Coming soon</p>
        <h1 className="text-display text-ink">{title}</h1>
        <p className="mt-3 max-w-[48ch] text-body text-ink-muted">{description}</p>
        <Link href="/" className="btn btn-secondary mt-8">
          Back home
        </Link>
      </section>
    </main>
  );
}
