'use client';

import { LIMITS } from '@fellow-owners/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, KeyRound, MonitorSmartphone } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { exportAccount } from '@/api/account';
import { AccountCard, authCall } from '@/components/account/account-card';
import { DeleteAccountCard } from '@/components/account/delete-account-card';
import { EmailPrefsCard } from '@/components/account/email-prefs-card';
import { Button } from '@/components/ui/button';
import { Field, TextField } from '@/components/ui/field';
import { authClient, useSession } from '@/lib/auth-client';
import { ApiError } from '@/lib/fetcher';
import { toastError, toastSuccess } from '@/lib/toast';

const SESSIONS_KEY = ['account', 'sessions'] as const;

const isDemoLock = (error: unknown) => error instanceof ApiError && error.code === 'DEMO_READ_ONLY';

const DEMO_NOTE = 'Not available in the demo.';

/**
 * The signed-in devices. The shared demo accounts are locked out of this by the API
 * (DEMO_READ_ONLY), which is also how the page knows it is in the demo without any email list.
 */
function useSessionsQuery() {
  return useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: async () => {
      const result = await authCall(() => authClient.listSessions());
      if ('error' in result) throw result.error;
      return result.data ?? [];
    },
    retry: (count, error) => !isDemoLock(error) && count < 2,
  });
}

function PasswordCard({ demo }: { demo: boolean }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<{ field: 'current' | 'next'; message: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (next.length < LIMITS.password.min || next.length > LIMITS.password.max) {
      setError({
        field: 'next',
        message: `Use ${LIMITS.password.min} to ${LIMITS.password.max} characters.`,
      });
      return;
    }
    setPending(true);
    const result = await authCall(() =>
      authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true,
      }),
    );
    setPending(false);
    if ('data' in result) {
      setCurrent('');
      setNext('');
      setError(null);
      toastSuccess('Password changed. Your other devices are signed out.');
      return;
    }
    const { code } = result.error;
    if (code === 'INVALID_PASSWORD') {
      setError({ field: 'current', message: 'That isn’t your current password.' });
    } else if (code === 'CREDENTIAL_ACCOUNT_NOT_FOUND') {
      setError({
        field: 'current',
        message: 'You sign in with Google, Apple or Facebook, so there is no password to change.',
      });
    } else {
      setError(null);
      toastError(result.error);
    }
  }

  return (
    <AccountCard icon={KeyRound} tint="aqua" title="Password" wide>
      <p className="text-body text-ink">
        Changing it signs you out everywhere else. Forgot it? Log out and use “Forgot password”.
      </p>
      {demo ? <p className="mt-1 text-small text-ink-muted">{DEMO_NOTE}</p> : null}
      <form onSubmit={onSubmit} className="mt-3 flex w-full max-w-md flex-col gap-4" noValidate>
        <Field
          label="Current password"
          error={error?.field === 'current' ? error.message : undefined}
        >
          <TextField
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            disabled={demo}
            required
          />
        </Field>
        <Field
          label="New password"
          helper={`At least ${LIMITS.password.min} characters.`}
          error={error?.field === 'next' ? error.message : undefined}
        >
          <TextField
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            disabled={demo}
            required
          />
        </Field>
        <Button
          type="submit"
          variant="secondary"
          surface="glass"
          icon={<KeyRound />}
          loading={pending}
          disabled={demo || !current || !next}
          className="self-start"
        >
          Change password
        </Button>
      </form>
    </AccountCard>
  );
}

/** "Chrome on macOS" from a user agent; good enough to tell your own devices apart. */
function deviceName(userAgent: string | null | undefined): string {
  if (!userAgent) return 'Unknown device';
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Firefox\//.test(userAgent)
      ? 'Firefox'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : 'Browser';
  const os = /iPhone|iPad/.test(userAgent)
    ? 'iOS'
    : /Android/.test(userAgent)
      ? 'Android'
      : /Mac OS X/.test(userAgent)
        ? 'macOS'
        : /Windows/.test(userAgent)
          ? 'Windows'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : null;
  return os ? `${browser} on ${os}` : browser;
}

function SessionsCard() {
  const queryClient = useQueryClient();
  const { data: current } = useSession();
  const [pending, setPending] = useState(false);
  const sessions = useSessionsQuery();
  const demo = isDemoLock(sessions.error);

  async function signOutOthers() {
    setPending(true);
    const result = await authCall(() => authClient.revokeOtherSessions());
    setPending(false);
    if ('error' in result) {
      toastError(result.error);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    toastSuccess('Other devices are signed out.');
  }

  const list = [...(sessions.data ?? [])].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const others = list.filter((s) => s.id !== current?.session.id).length;

  return (
    <AccountCard icon={MonitorSmartphone} tint="lavender" title="Signed-in devices" wide>
      <p className="text-body text-ink">
        Where you are signed in now. Signing out other devices takes effect within 5 minutes.
      </p>
      {sessions.isPending ? (
        <p className="mt-2 text-small text-ink-muted">Loading devices…</p>
      ) : demo ? (
        <p className="mt-2 text-small text-ink-muted">{DEMO_NOTE}</p>
      ) : sessions.error ? (
        <p className="mt-2 text-small text-danger-deep">Couldn’t load your devices.</p>
      ) : (
        <ul className="mt-2 flex w-full flex-col divide-y divide-white/60">
          {list.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-body text-ink">{deviceName(s.userAgent)}</span>
              <span className="text-small text-ink-muted">
                {s.id === current?.session.id
                  ? 'This device'
                  : `Active ${new Date(s.updatedAt).toLocaleDateString()}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="secondary"
        surface="glass"
        className="mt-3"
        loading={pending}
        disabled={demo || others === 0}
        onClick={signOutOthers}
      >
        Sign out other devices
      </Button>
    </AccountCard>
  );
}

function DataCard() {
  const [pending, setPending] = useState(false);

  async function download() {
    setPending(true);
    try {
      const data = await exportAccount();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'fellow-owners-export.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toastError(error, { retry: download });
    } finally {
      setPending(false);
    }
  }

  return (
    <AccountCard icon={Download} tint="white" title="Your data">
      <p className="text-body text-ink">
        A JSON file with your profile, spaces, memberships, posts, comments, pitches and
        notifications.
      </p>
      <Button
        variant="secondary"
        surface="card"
        icon={<Download />}
        loading={pending}
        className="mt-3"
        onClick={download}
      >
        Download my data
      </Button>
    </AccountCard>
  );
}

/**
 * The account cards a signed-in person manages for themselves: password, devices, notification
 * emails, data download and deletion. `ownsSpace` changes what deletion says it removes.
 */
export function AccountSettings({ ownsSpace }: { ownsSpace: boolean }) {
  const demo = isDemoLock(useSessionsQuery().error);
  return (
    <>
      <PasswordCard demo={demo} />
      <SessionsCard />
      <EmailPrefsCard />
      <DataCard />
      <DeleteAccountCard ownsSpace={ownsSpace} demo={demo} />
    </>
  );
}
