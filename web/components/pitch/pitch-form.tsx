'use client';

import {
  type CoachResult,
  type CreatePitchInput,
  createPitchSchema,
  DAILY_CAPS,
  LIMITS,
  PITCH_TYPE_LABELS,
  PITCH_TYPES,
} from '@fellow-owners/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { ChoicePills, LinksField } from '@/components/post/form-parts';
import { Banner } from '@/components/shared/banner';
import { CoachPanel } from '@/components/shared/coach-panel';
import { Button } from '@/components/ui/button';
import { Field, TextArea, TextField } from '@/components/ui/field';
import {
  loadPitchDraft,
  type PitchDraft,
  type SendPitchMutation,
  savePitchDraft,
} from '@/hooks/queries/use-pitches';
import { formatNumber, pluralize } from '@/lib/format';
import { PitchSent } from './pitch-sent';

const TYPE_OPTIONS = PITCH_TYPES.map((value) => ({ value, label: PITCH_TYPE_LABELS[value] }));

const EMPTY: CreatePitchInput = { type: 'collab', subject: '', body: '', links: [] };

export interface PitchFormProps {
  handle: string;
  /** The creator's first name: "Mira". */
  creatorName: string;
  /** MySpace.caps.pitchesLeftToday */
  pitchesLeftToday: number;
  /** The creator's setting, for the tracker on the confirmation. */
  showReadReceipts: boolean;
  /** Design phase: the captured Idea Coach answer. Only shown in demo space. */
  coachSample: CoachResult | null;
  /** The mutation for sending an idea. */
  sendPitchMutation: SendPitchMutation;
}

/**
 * Send an idea (J4): type, subject, body and up to three links on a strong-glass card, checked by the
 * shared createPitchSchema. No prices and no paid priority anywhere. The draft is kept in sessionStorage
 * per handle; Send idea (the one coral) ends on the confirmation that says where the reply appears.
 */
export function PitchForm({
  handle,
  creatorName,
  pitchesLeftToday,
  showReadReceipts,
  coachSample,
  sendPitchMutation,
}: PitchFormProps) {
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const capId = useId();
  const form = useForm({
    resolver: zodResolver(createPitchSchema),
    defaultValues: EMPTY,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const {
    register,
    watch,
    reset,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;
  const capped = pitchesLeftToday <= 0;

  // Bring back this tab's draft, then keep saving it as the person types.
  useEffect(() => {
    const saved = loadPitchDraft(handle);
    if (saved) reset({ ...EMPTY, ...saved });
    const subscription = watch((values) => savePitchDraft(handle, values as PitchDraft));
    return () => subscription.unsubscribe();
  }, [handle, reset, watch]);

  useEffect(() => {
    if (sentAt) document.getElementById('pitch-sent-title')?.focus();
  }, [sentAt]);

  if (sentAt)
    return (
      <PitchSent
        handle={handle}
        creatorName={creatorName}
        showReadReceipts={showReadReceipts}
        sentAt={sentAt}
      />
    );

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    sendPitchMutation.mutate(values, {
      onSuccess: () => {
        setSentAt(new Date().toISOString());
      },
      onError: (error) => {
        // The hook handles toast for most errors; show inline errors for field/cap messages.
        if (error instanceof Error) {
          setSubmitError(error.message);
        }
      },
    });
  });

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={onSubmit}
        aria-label={`Idea for ${creatorName}`}
        className="flex flex-col gap-6 glass-strong p-6 sm:p-8"
      >
        {submitError ? <Banner>{submitError}</Banner> : null}

        <ChoicePills
          legend="What is it about?"
          options={TYPE_OPTIONS}
          value={watch('type')}
          input={register('type')}
          error={errors.type?.message}
        />

        <Field
          label="Subject"
          helper={`One line ${creatorName} can decide on.`}
          count={{ value: watch('subject').length, max: LIMITS.pitch.subject.max }}
          error={errors.subject?.message}
        >
          <TextField {...register('subject')} placeholder="A Lisbon food crawl with a guide" />
        </Field>

        <Field
          label="Your idea"
          helper={`What you have in mind, why ${creatorName}, and what would happen next.`}
          count={{ value: watch('body').length, max: LIMITS.pitch.body.max }}
          error={errors.body?.message}
        >
          <TextArea {...register('body')} rows={8} />
        </Field>

        {coachSample ? (
          <CoachPanel
            kind="pitch"
            creatorName={creatorName}
            draft={{ subject: watch('subject'), body: watch('body') }}
            onReplace={({ subject, body }) => {
              setValue('subject', subject, { shouldDirty: true });
              setValue('body', body, { shouldDirty: true });
            }}
            sample={coachSample}
          />
        ) : null}

        <LinksField
          max={LIMITS.pitch.links.max}
          helper={`Up to ${LIMITS.pitch.links.max}, such as your work, a channel or a past trip.`}
        />

        <div className="flex flex-col-reverse gap-3 border-t border-ink/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p id={capId} className="text-small text-ink-soft">
            {capped ? (
              `You've reached today's limit of ${DAILY_CAPS.pitches} ideas for ${creatorName}. Try again tomorrow.`
            ) : (
              <>
                <span className="tabular-nums">{formatNumber(pitchesLeftToday)}</span>{' '}
                {pluralize(pitchesLeftToday, 'idea')} left today
              </>
            )}
          </p>
          <Button
            type="submit"
            disabled={capped || isSubmitting || sendPitchMutation.isPending}
            aria-describedby={capId}
            className="max-sm:w-full"
          >
            {sendPitchMutation.isPending ? 'Sending...' : 'Send idea'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
