'use client';

import {
  type ChallengeEntryInput,
  type ChallengeSummary,
  challengeEntrySchema,
  LIMITS,
} from '@fellow-owners/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trophy } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { acceptsEntries } from '@/components/community/challenge-time.mjs';
import { entryErrorMessage, useEnterChallenge } from '@/components/community/use-space-challenges';
import { Banner } from '@/components/shared/banner';
import { GlassPanel } from '@/components/shared/glass-panel';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Field, TextArea, TextField } from '@/components/ui/field';
import { routes } from '@/lib/routes';
import { toastSuccess } from '@/lib/toast';
import { LinksField } from './form-parts';

/**
 * Enter a challenge: the post form with the challenge's title and prompt shown above it. An entry is an
 * idea post, so it is just a title, the details and up to three links, checked by the shared
 * challengeEntrySchema. Publish is the screen's one coral action. A closed or past-due challenge shows
 * a plain message instead of the form; if it closes while the fan is typing, the API answers 409 and the
 * same message appears above the form with what was typed kept.
 */
export function ChallengeEntryForm({
  handle,
  challenge,
}: {
  handle: string;
  challenge: ChallengeSummary;
}) {
  const router = useRouter();
  const enter = useEnterChallenge(handle, challenge.id);
  const form = useForm<ChallengeEntryInput, unknown, z.output<typeof challengeEntrySchema>>({
    resolver: zodResolver(challengeEntrySchema),
    defaultValues: { title: '', body: '', links: [] },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = form;
  const open = acceptsEntries(challenge);
  const back = routes.fan.space(handle);

  if (!open) {
    return (
      <GlassPanel strength="strong" className="flex flex-col items-start gap-4 p-6 sm:p-8">
        <h2 className="text-h2 text-ink">This challenge has closed</h2>
        <p className="max-w-[60ch] text-body text-ink">
          “{challenge.title}” isn’t taking new entries. Keep an eye on the community for the next
          one.
        </p>
        <Link href={back} className={buttonVariants({ variant: 'secondary' })}>
          Back to the space
        </Link>
      </GlassPanel>
    );
  }

  const onSubmit = handleSubmit((entry) =>
    enter.mutate(entry, {
      onSuccess: (post) => {
        toastSuccess('Your entry is in');
        router.push(routes.fan.post(handle, post.id));
      },
    }),
  );

  return (
    <div className="flex flex-col gap-4">
      <GlassPanel strength="strong" className="flex items-start gap-4 p-5">
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-2xl bg-aurora-peach"
        >
          <Trophy strokeWidth={1.5} className="size-6 text-coral" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-caption text-ink-soft">
            Challenge{challenge.communityName ? ` · ${challenge.communityName}` : ''}
          </p>
          <h2 className="text-h2 text-ink">{challenge.title}</h2>
          {challenge.body ? (
            <p className="max-w-[60ch] text-body text-ink">{challenge.body}</p>
          ) : null}
        </div>
      </GlassPanel>

      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={onSubmit}
          aria-label={`Enter ${challenge.title}`}
          className="glass-strong flex flex-col gap-6 p-6 sm:p-8"
        >
          {enter.isError ? (
            <div role="alert">
              <Banner>{entryErrorMessage(enter.error, challenge.communityName)}</Banner>
            </div>
          ) : null}
          <Field
            label="Title"
            helper="One line that says what you’re entering."
            count={{ value: watch('title').length, max: LIMITS.post.title.max }}
            error={errors.title?.message}
          >
            <TextField {...register('title')} placeholder="The meal, the place, the price" />
          </Field>
          <Field
            label="Details"
            helper="The idea, who it’s for, and what would help."
            count={{ value: watch('body').length, max: LIMITS.post.body.max }}
            error={errors.body?.message}
          >
            <TextArea {...register('body')} rows={8} />
          </Field>
          <LinksField max={LIMITS.post.links.max} />
          <div className="flex border-t border-ink/10 pt-6">
            <Button type="submit" loading={enter.isPending} className="max-sm:w-full">
              Enter the challenge
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
