'use client';

import { useEffect, useRef, useState } from 'react';
import { useSignOut } from '@/hooks/use-sign-out';
import { clearAuthHint } from '@/lib/local-state';
import { AuthCard, AuthHeading, Spinner } from './auth-ui';

/** Signs out on arrival; if that fails the toast explains and one button tries again. */
export function SignOut() {
  const signOut = useSignOut();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  function run() {
    setFailed(false);
    void signOut().then((ok) => {
      if (ok) clearAuthHint();
      setFailed(!ok);
    });
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: once on arrival; Strict Mode must not sign out twice.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, []);

  return (
    <AuthCard size="short">
      <AuthHeading title={failed ? 'Still signed in' : 'Signing you out'} />
      <div role="status" className="mt-6 flex justify-center">
        {failed ? (
          <button type="button" onClick={run} className="btn btn-secondary">
            Try again
          </button>
        ) : (
          <>
            <Spinner />
            <span className="sr-only">Signing you out</span>
          </>
        )}
      </div>
    </AuthCard>
  );
}
