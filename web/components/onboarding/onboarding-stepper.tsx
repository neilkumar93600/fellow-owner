'use client';

import { createSpaceSchema } from '@fellow-owners/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLenis } from 'lenis/react';
import { ArrowLeft, Check, CircleAlert, Eye } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type FieldPath, FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { createSpace, getMySpace } from '@/api/studio';
import { SplitShell } from '@/components/layout/split-shell';
import { signOut, useSession } from '@/lib/auth-client';
import { ApiError } from '@/lib/fetcher';
import { CommunitiesStep, type EditorPreview, FIRST_TILE_ID } from './communities-step';
import { HandleStep, useHandleAvailability } from './handle-step';
import styles from './onboarding.module.css';
import { cx, Spinner } from './onboarding-fields';
import { OnboardingPreview } from './onboarding-preview';
import {
  clearDraft,
  DEFAULT_VALUES,
  HOST,
  isBlankDraft,
  LAST_STEP,
  loadDraft,
  type OnboardingOutput,
  type OnboardingValues,
  STEP_FIELDS,
  STEPS,
  type StepIndex,
  saveDraft,
  stepForPath,
} from './onboarding-templates';
import { PlatformsStep } from './platforms-step';
import { TasteStep } from './taste-step';

type SubmitProblem = 'unavailable' | 'session' | 'exists';

// zod strips the form-only `templateId`, and NaN followers fail as "Enter a number", so the
// shared schema can validate the slightly looser form shape directly.
const resolver = zodResolver(createSpaceSchema) as unknown as Resolver<
  OnboardingValues,
  unknown,
  OnboardingOutput
>;

/**
 * /onboarding, "Create your space" (03-app-flow §2, F3): four steps, one per screen, over one form.
 * Values persist between steps and to localStorage; the right panel previews the bio link page live.
 */
export function OnboardingStepper() {
  const router = useRouter();
  const lenis = useLenis();
  const form = useForm<OnboardingValues, unknown, OnboardingOutput>({
    resolver,
    defaultValues: DEFAULT_VALUES,
    mode: 'onSubmit',
    shouldFocusError: false,
  });
  const {
    control,
    trigger,
    getValues,
    setValue,
    setError,
    reset,
    handleSubmit,
    watch,
    getFieldState,
  } = form;

  const [step, setStep] = useState<StepIndex>(0);
  const [restored, setRestored] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<SubmitProblem | null>(null);
  const [editorPreview, setEditorPreview] = useState<EditorPreview | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const handleInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const stepRef = useRef<StepIndex>(0);
  const focusAfterStep = useRef<'heading' | 'handle' | 'error' | null>(null);
  const finished = useRef(false);

  const values = useWatch({ control }) as OnboardingValues;
  const handle = useWatch({ control, name: 'handle' }) ?? '';
  const { status: handleStatus, markTaken } = useHandleAvailability(handle);
  const session = useSession();
  const sessionName = session.data?.user?.name;
  const sessionEmail = session.data?.user?.email;

  stepRef.current = step;

  // Restore a saved draft once, before anything is written back.
  useEffect(() => {
    const draft = loadDraft();
    if (draft && !isBlankDraft(draft.values)) {
      reset(draft.values);
      setStep(draft.step);
    }
    setRestored(true);
  }, [reset]);

  // The name typed on sign up (or from Google) is the natural display name.
  useEffect(() => {
    if (restored && sessionName && !getValues('displayName')) {
      setValue('displayName', sessionName.slice(0, 60));
    }
  }, [restored, sessionName, getValues, setValue]);

  // Someone who already has a space belongs on Today, not here. If the API is down, stay.
  useEffect(() => {
    let alive = true;
    getMySpace()
      .then(() => {
        if (alive && !finished.current) router.replace('/dashboard');
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [router]);

  // Save to this device as the person types, and on every step change.
  useEffect(() => {
    if (!restored) return;
    let timer: number | undefined;
    const sub = watch(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!finished.current) saveDraft({ step: stepRef.current, values: getValues() });
      }, 300);
    });
    return () => {
      sub.unsubscribe();
      window.clearTimeout(timer);
    };
  }, [restored, watch, getValues]);

  useEffect(() => {
    if (restored && !finished.current) saveDraft({ step, values: getValues() });
  }, [step, restored, getValues]);

  // Once a field shows an error, re-check it as it changes so the error clears the moment it's fixed.
  useEffect(() => {
    const sub = watch((_, { name }) => {
      if (!name) return;
      const path = name as FieldPath<OnboardingValues>;
      if (getFieldState(path).error) void trigger(path);
    });
    return () => sub.unsubscribe();
  }, [watch, getFieldState, trigger]);

  // After a step change: scroll to the top on small screens, then move focus.
  useEffect(() => {
    const target = focusAfterStep.current;
    if (!target) return;
    focusAfterStep.current = null;
    const top = formRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) {
      if (lenis) lenis.scrollTo(0, { immediate: true });
      else window.scrollTo({ top: 0 });
    }
    requestAnimationFrame(() => {
      if (target === 'handle') handleInputRef.current?.focus();
      else if (target === 'error') focusFirstError();
      else headingRef.current?.focus({ preventScroll: true });
    });
  });

  const goTo = useCallback((next: StepIndex, focus: 'heading' | 'handle' | 'error' = 'heading') => {
    focusAfterStep.current = focus;
    setEditorPreview(null);
    setStep(next);
  }, []);

  function focusFirstError() {
    requestAnimationFrame(() => {
      const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      if (el) {
        el.focus();
        return;
      }
      if (stepRef.current === 2) document.getElementById(FIRST_TILE_ID)?.focus();
      else
        formRef.current
          ?.querySelector<HTMLElement>('[id$="-error"]:not(:empty)')
          ?.scrollIntoView({ block: 'center' });
    });
  }

  /** Blank platform rows and empty taste lines are dropped rather than reported. */
  function tidy(forStep: StepIndex | 'all') {
    if (forStep === 1 || forStep === 'all') {
      const rows = getValues('platforms').filter(
        (p) => p.url.trim() || Number.isFinite(p.followers),
      );
      if (rows.length !== getValues('platforms').length) setValue('platforms', rows);
    }
    if (forStep === 3 || forStep === 'all') {
      const t = getValues('tasteProfile');
      const clean = (list: string[]) => list.map((l) => l.trim()).filter(Boolean);
      const promote = clean(t.promote);
      setValue('tasteProfile', {
        promote,
        never: clean(t.never),
        voice: clean(t.voice),
      });
    }
  }

  async function next() {
    tidy(step);
    const ok = await trigger(STEP_FIELDS[step] as unknown as FieldPath<OnboardingValues>[]);
    if (!ok) {
      focusFirstError();
      return;
    }
    if (
      step === 0 &&
      handleStatus.state === 'taken' &&
      handleStatus.handle === getValues('handle')
    ) {
      setError('handle', {
        type: 'taken',
        message:
          handleStatus.reason === 'reserved'
            ? 'This handle is reserved. Pick another one.'
            : 'This handle is taken. Pick another one.',
      });
      handleInputRef.current?.focus();
      return;
    }
    if (step < LAST_STEP) goTo((step + 1) as StepIndex);
  }

  function back() {
    if (step > 0) goTo((step - 1) as StepIndex);
  }

  async function create(data: OnboardingOutput) {
    setSubmitting(true);
    setProblem(null);
    try {
      await createSpace({
        ...data,
        bio: data.bio?.trim() ? data.bio.trim() : null,
        communities: data.communities.map((c) => ({
          ...c,
          description: c.description?.trim() ? c.description.trim() : undefined,
        })),
      });
      finished.current = true;
      clearDraft();
      toast('Your space is live', { description: `${HOST}/${data.handle}` });
      router.push('/dashboard');
    } catch (error) {
      setSubmitting(false);
      onCreateError(error, data.handle);
    }
  }

  function onCreateError(error: unknown, submittedHandle: string) {
    if (error instanceof ApiError) {
      if (error.code === 'handle_taken') {
        markTaken(submittedHandle, suggestionsFrom(error.details));
        setError('handle', {
          type: 'taken',
          message: 'This handle was just taken. Pick another one.',
        });
        goTo(0, 'handle');
        return;
      }
      if (error.code === 'validation_error') {
        const issues = issuesFrom(error.details);
        if (issues.length > 0) {
          let first: StepIndex = LAST_STEP;
          for (const issue of issues) {
            setError(issue.path as FieldPath<OnboardingValues>, {
              type: 'server',
              message: issue.message,
            });
            first = Math.min(first, stepForPath(issue.path)) as StepIndex;
          }
          if (first !== step) goTo(first, 'error');
          else focusFirstError();
          return;
        }
      }
      if (error.status === 401) {
        setProblem('session');
        return;
      }
      if (error.status === 409 || error.code === 'conflict') {
        setProblem('exists');
        return;
      }
    }
    setProblem('unavailable');
  }

  function onInvalid(errors: Record<string, unknown>) {
    const paths = Object.keys(errors);
    const first = paths.reduce<StepIndex>(
      (min, p) => Math.min(min, stepForPath(p)) as StepIndex,
      LAST_STEP,
    );
    if (first !== step) goTo(first, 'error');
    else focusFirstError();
  }

  function onFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    if (step < LAST_STEP) {
      void next();
      return;
    }
    tidy('all');
    void handleSubmit(create, onInvalid)(e);
  }

  async function onSignOut() {
    const result = await signOut().catch(() => ({ error: true }));
    if (result && 'error' in result && result.error) {
      toast('Could not sign out', { description: 'Check your connection and try again.' });
      return;
    }
    clearDraft();
    router.push('/');
  }

  const meta = STEPS[step];

  return (
    <FormProvider {...form}>
      <SplitShell
        className={styles.root}
        aside={<OnboardingPreview values={values} step={step} editor={editorPreview} />}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Check aria-hidden strokeWidth={1.5} className="size-4" />
              Saved on this device as you go
            </span>
            <span className="inline-flex flex-wrap items-center gap-x-1.5">
              {sessionEmail ? (
                <span className="break-all">Signed in as {sessionEmail}.</span>
              ) : null}
              <button
                type="button"
                onClick={onSignOut}
                className="-mx-1 inline-flex min-h-11 items-center rounded-full px-1 font-medium text-ink underline-offset-4 hover:underline sm:min-h-0"
              >
                Sign out
              </button>
            </span>
          </div>
        }
      >
        <div className="mx-auto flex w-full max-w-[32rem] flex-1 flex-col">
          <form
            ref={formRef}
            noValidate
            onSubmit={onFormSubmit}
            onKeyDown={(e) => {
              // On the last step, Enter in a field must never create the space by accident.
              const tag = (e.target as HTMLElement).tagName;
              if (e.key === 'Enter' && step === LAST_STEP && tag === 'INPUT') e.preventDefault();
            }}
            aria-labelledby="ob-step-title"
            className="flex flex-col"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="tabular text-small font-medium text-ink-soft">
                Step {step + 1} of {STEPS.length}
              </p>
              <a
                href="#onboarding-preview"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-small font-medium text-ink hover:bg-page lg:hidden"
              >
                <Eye aria-hidden strokeWidth={1.5} className="size-4" />
                Preview
              </a>
            </div>
            <h1
              ref={headingRef}
              id="ob-step-title"
              tabIndex={-1}
              className="mt-2 text-h1 text-ink sm:text-display sm:tracking-[-0.01em]"
            >
              {meta.title}
            </h1>
            <p className="mt-2 max-w-[46ch] text-body text-ink-muted">{meta.helper}</p>

            <ProgressRail step={step} onJump={(i) => goTo(i)} />

            <div key={step} className={cx(styles.stepEnter, 'mt-8')}>
              {step === 0 ? (
                <HandleStep status={handleStatus} handleInputRef={handleInputRef} />
              ) : null}
              {step === 1 ? <PlatformsStep /> : null}
              {step === 2 ? <CommunitiesStep onEditorPreview={setEditorPreview} /> : null}
              {step === 3 ? <TasteStep /> : null}
            </div>

            {problem ? (
              <SubmitAlert
                problem={problem}
                onRetry={() => formRef.current?.requestSubmit()}
                retrying={submitting}
              />
            ) : null}

            <div className="mt-8 flex items-center gap-3">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={back}
                  disabled={submitting}
                  className="btn btn-secondary shrink-0 px-5"
                >
                  <ArrowLeft aria-hidden strokeWidth={1.5} className="size-4" />
                  Back
                </button>
              ) : null}
              <button
                type="submit"
                aria-busy={submitting || undefined}
                disabled={submitting}
                className="btn btn-primary ml-auto min-w-0 flex-1 sm:min-w-[11rem] sm:flex-none"
              >
                {submitting ? <Spinner /> : null}
                {step === LAST_STEP ? 'Create my space' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      </SplitShell>
    </FormProvider>
  );
}

function ProgressRail({ step, onJump }: { step: StepIndex; onJump: (step: StepIndex) => void }) {
  return (
    <nav aria-label="Onboarding progress" className="mt-6">
      <ol className="flex gap-1.5">
        {STEPS.map((s, i) => {
          const state = i < step ? 'done' : i === step ? 'current' : 'upcoming';
          const inner = (
            <>
              <span
                aria-hidden
                className={cx(
                  'block h-1.5 w-full rounded-full transition-colors duration-200 ease-(--ease-out-quart)',
                  state === 'upcoming'
                    ? 'bg-table-head'
                    : 'bg-lime shadow-[inset_0_0_0_1px_rgb(45_45_48/0.10)]',
                )}
              />
              <span
                className={cx(
                  'mt-2 flex items-center gap-1 text-caption whitespace-nowrap',
                  state === 'current' && 'font-semibold text-ink',
                  state === 'done' && 'text-ink',
                  state === 'upcoming' && 'font-normal text-ink-muted',
                )}
              >
                {state === 'done' ? (
                  <Check aria-hidden strokeWidth={2} className="size-3.5 shrink-0" />
                ) : null}
                {s.label}
                <span className="sr-only">
                  {state === 'done'
                    ? ', done. Go back to this step'
                    : state === 'current'
                      ? ', current step'
                      : ', not started'}
                </span>
              </span>
            </>
          );
          return (
            <li
              key={s.key}
              aria-current={state === 'current' ? 'step' : undefined}
              className="min-w-max flex-1"
            >
              {state === 'done' ? (
                <button
                  type="button"
                  onClick={() => onJump(i as StepIndex)}
                  className="group block w-full rounded-lg py-2 text-left hover:[&>span:last-child]:underline"
                >
                  {inner}
                </button>
              ) : (
                <div className="py-2">{inner}</div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function SubmitAlert({
  problem,
  onRetry,
  retrying,
}: {
  problem: SubmitProblem;
  onRetry: () => void;
  retrying: boolean;
}) {
  const copy: Record<SubmitProblem, { title: string; body: string }> = {
    unavailable: {
      title: "We couldn't create your space right now.",
      body: 'Your answers are saved on this device. Try again in a moment.',
    },
    session: {
      title: 'Your session has ended.',
      body: 'Sign in again to finish. Your answers are saved on this device.',
    },
    exists: {
      title: 'You already have a space.',
      body: 'Each account has one space for now. Head to your dashboard to manage it.',
    },
  };
  const c = copy[problem];
  return (
    <div
      role="alert"
      className="mt-8 flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 sm:flex-row sm:items-center"
    >
      <div className="flex flex-1 items-start gap-2.5">
        <CircleAlert aria-hidden strokeWidth={1.5} className="mt-0.5 size-5 shrink-0 text-danger" />
        <p className="text-body text-ink">
          <span className="font-medium">{c.title}</span>{' '}
          <span className="text-ink-soft">{c.body}</span>
        </p>
      </div>
      {problem === 'unavailable' ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          aria-busy={retrying || undefined}
          className="btn btn-secondary h-10 shrink-0 self-start px-4 sm:self-auto"
        >
          {retrying ? <Spinner /> : null}
          Retry
        </button>
      ) : problem === 'session' ? (
        <Link
          href="/login?returnTo=%2Fonboarding"
          className="btn btn-secondary h-10 shrink-0 self-start px-4 sm:self-auto"
        >
          Sign in
        </Link>
      ) : (
        <Link
          href="/dashboard"
          className="btn btn-secondary h-10 shrink-0 self-start px-4 sm:self-auto"
        >
          Go to dashboard
        </Link>
      )}
    </div>
  );
}

/** handle_taken carries suggestions as `{ suggestions: [] }` or a bare array. */
function suggestionsFrom(details: unknown): string[] {
  const list = Array.isArray(details)
    ? details
    : details &&
        typeof details === 'object' &&
        Array.isArray((details as { suggestions?: unknown }).suggestions)
      ? (details as { suggestions: unknown[] }).suggestions
      : [];
  return list.filter((s): s is string => typeof s === 'string').slice(0, 3);
}

/** validation_error carries zod issues: a bare array, `{ issues }`, or `{ fieldErrors }`. */
function issuesFrom(details: unknown): { path: string; message: string }[] {
  const out: { path: string; message: string }[] = [];
  const raw = Array.isArray(details)
    ? details
    : details && typeof details === 'object'
      ? ((details as { issues?: unknown }).issues ?? null)
      : null;
  if (Array.isArray(raw)) {
    for (const issue of raw) {
      if (!issue || typeof issue !== 'object') continue;
      const { path, message } = issue as { path?: unknown; message?: unknown };
      const p = Array.isArray(path) ? path.join('.') : typeof path === 'string' ? path : '';
      if (p && typeof message === 'string') out.push({ path: p, message });
    }
    return out;
  }
  const fieldErrors =
    details && typeof details === 'object'
      ? (details as { fieldErrors?: Record<string, unknown> }).fieldErrors
      : undefined;
  if (fieldErrors) {
    for (const [p, messages] of Object.entries(fieldErrors)) {
      const m = Array.isArray(messages) ? messages[0] : messages;
      if (typeof m === 'string') out.push({ path: p, message: m });
    }
  }
  return out;
}
