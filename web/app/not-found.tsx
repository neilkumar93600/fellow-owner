import Link from 'next/link';
import { Logo } from '@/components/shared/logo';

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center bg-page p-4 sm:p-6">
      <div className="relative isolate flex w-full max-w-3xl flex-col items-center overflow-hidden rounded-shell bg-shell px-6 py-20 text-center sm:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-24 -z-10 size-96 rounded-full bg-blur-2 opacity-40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-24 -bottom-32 -z-10 size-80 rounded-full bg-blur-1 opacity-40 blur-3xl"
        />
        <Logo className="mb-10" />
        <p className="eyebrow mb-6">404</p>
        <h1 className="max-w-[16ch] text-section text-ink">This page isn&apos;t here.</h1>
        <p className="mt-5 max-w-[46ch] text-lead text-ink-muted">
          The link may be old, or the space may have a new handle. You can head home, or start a
          space of your own.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-secondary">
            Back home
          </Link>
          <Link href="/login?returnTo=/onboarding" className="btn btn-primary">
            Start your own space
          </Link>
        </div>
      </div>
    </main>
  );
}
