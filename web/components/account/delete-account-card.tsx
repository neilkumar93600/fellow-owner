'use client';

import { Trash2 } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { AccountCard, authCall } from '@/components/account/account-card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, TextField } from '@/components/ui/field';
import { authClient } from '@/lib/auth-client';
import { routes } from '@/lib/routes';

const CONFIRM_WORD = 'delete';

/**
 * Account deletion: typed confirmation, then the code Better Auth emails (pasted back as the
 * deleteUser token). The API removes the space or memberships first (api/src/services/account).
 */
export function DeleteAccountCard({
  ownsSpace,
  demo = false,
}: {
  ownsSpace: boolean;
  demo?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'confirm' | 'code'>('confirm');
  const [typed, setTyped] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setStep('confirm');
      setTyped('');
      setCode('');
      setError(null);
    }
  }

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    if (typed.trim().toLowerCase() !== CONFIRM_WORD) {
      setError(`Type “${CONFIRM_WORD}” to continue.`);
      return;
    }
    setPending(true);
    const result = await authCall(() => authClient.deleteUser({}));
    setPending(false);
    if ('error' in result) {
      setError(result.error.message);
      return;
    }
    setError(null);
    setStep('code');
  }

  async function confirmDelete(event: React.FormEvent) {
    event.preventDefault();
    const token = code.replace(/\s+/g, '').toLowerCase();
    if (!token) {
      setError('Paste the code from the email.');
      return;
    }
    setPending(true);
    const result = await authCall(() => authClient.deleteUser({ token }));
    if ('error' in result) {
      setPending(false);
      setError(
        result.error.code === 'INVALID_TOKEN'
          ? 'That code didn’t match or has expired. Check the email, or start again for a new one.'
          : result.error.message,
      );
      return;
    }
    // The session is gone: a full load drops every cached signed-in page.
    window.location.assign(routes.home());
  }

  return (
    <AccountCard icon={Trash2} tint="peach" title="Delete account">
      <p className="text-body text-ink">
        {ownsSpace
          ? 'Deletes your account and your space, with its communities and everything fans posted there.'
          : 'Deletes your account and your pitches. Your posts and comments stay, signed “Former member”.'}
      </p>
      {demo ? <p className="mt-1 text-small text-ink-muted">Not available in the demo.</p> : null}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <Button
          variant="destructive"
          icon={<Trash2 />}
          className="mt-3"
          disabled={demo}
          onClick={() => setOpen(true)}
        >
          Delete account
        </Button>
        <DialogContent>
          <DialogTitle>Delete your account?</DialogTitle>
          {step === 'confirm' ? (
            <form onSubmit={sendCode} noValidate>
              <DialogDescription>
                This can’t be undone.{' '}
                {ownsSpace
                  ? 'Your space and everything in it are deleted for everyone.'
                  : 'Your memberships and pitches are deleted; your posts and comments stay without your name.'}{' '}
                We’ll email you a code to confirm.
              </DialogDescription>
              <Field
                label={`Type “${CONFIRM_WORD}” to confirm`}
                error={error ?? undefined}
                className="mt-4"
              >
                <TextField
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </Field>
              <DialogFooter>
                <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
                <Button type="submit" variant="destructive-secondary" loading={pending}>
                  Email me a code
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={confirmDelete} noValidate>
              <DialogDescription>
                We sent a code to your email. It works for 10 minutes. Paste it here to delete your
                account.
              </DialogDescription>
              <Field label="Code from the email" error={error ?? undefined} className="mt-4">
                <TextField
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="one-time-code"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </Field>
              <DialogFooter>
                <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
                <Button
                  type="submit"
                  variant="destructive-secondary"
                  icon={<Trash2 />}
                  loading={pending}
                >
                  Delete my account
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AccountCard>
  );
}
