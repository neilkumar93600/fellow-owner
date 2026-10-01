'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-svh place-items-center bg-page p-6">
      <div className="flex max-w-lg flex-col items-center rounded-shell bg-shell px-8 py-16 text-center">
        <h1 className="text-display text-ink">Something went wrong.</h1>
        <p className="mt-3 text-body text-ink-muted">
          Nothing you did. Try again, and if it keeps happening, reload the page.
        </p>
        <button type="button" onClick={reset} className="btn btn-primary mt-8">
          Try again
        </button>
      </div>
    </main>
  );
}
