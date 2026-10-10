'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Check, Circle } from 'lucide-react';
import Link from 'next/link';
import { markChecklistStep } from '@/api/snoozes';
import { CopyButton } from '@/components/shared/copy-button';
import { buttonVariants } from '@/components/ui/button';
import { studioKeys, useStudioSpace } from '@/hooks/use-space';
import { routes } from '@/lib/routes';

export interface SetupChecklistProps {
  handle: string;
  members: number;
  communities: number;
}

/** A new space's first steps, ticked from real counts. Today hides it once there are members and communities. */
export function SetupChecklist({ handle, members, communities }: SetupChecklistProps) {
  const queryClient = useQueryClient();
  const space = useStudioSpace();
  const markShared = () => {
    markChecklistStep({ step: 'bio_link_shared' })
      .then(() => queryClient.invalidateQueries({ queryKey: studioKeys.space }))
      .catch(() => {});
  };
  const bioLink = `${typeof window === 'undefined' ? '' : window.location.origin}${routes.fan.space(handle)}`;
  const steps = [
    {
      key: 'communities',
      label: 'Set up your communities',
      done: communities > 0,
      action: (
        <Link
          href={routes.dashboard.communities()}
          className={buttonVariants({ variant: 'secondary', surface: 'card' })}
        >
          Open communities
        </Link>
      ),
    },
    {
      key: 'link',
      label: 'Share your bio link',
      done: Boolean(space.data?.bioLinkSharedAt),
      action: (
        <span onClickCapture={markShared}>
          <CopyButton
            value={bioLink}
            label="Copy bio link"
            variant="secondary"
            surface="card"
            message="Bio link copied"
          />
        </span>
      ),
    },
    {
      key: 'followers',
      label: 'Import your audience',
      done: members > 0,
      action: (
        <Link
          href={routes.dashboard.followers({ import: true })}
          className={buttonVariants({ variant: 'secondary', surface: 'card' })}
        >
          Import followers
        </Link>
      ),
    },
  ];
  return (
    <section aria-labelledby="setup-title" className="min-w-0 rounded-card bg-card p-6">
      <h2 id="setup-title" className="text-h2 text-ink">
        Get your space going
      </h2>
      <ul className="mt-2">
        {steps.map(({ key, label, done, action }) => (
          <li
            key={key}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-line-row py-3 last:border-b-0"
          >
            <span className="flex items-center gap-3 text-body text-ink">
              {done ? (
                <Check aria-hidden="true" strokeWidth={1.5} className="size-5 text-ink-soft" />
              ) : (
                <Circle aria-hidden="true" strokeWidth={1.5} className="size-5 text-ink-soft" />
              )}
              {label}
              <span className="sr-only">{done ? ', done' : ', to do'}</span>
            </span>
            {done ? null : action}
          </li>
        ))}
      </ul>
    </section>
  );
}
