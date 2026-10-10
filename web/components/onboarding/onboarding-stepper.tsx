'use client';

import { createSpaceSchema, displayNameSchema } from '@fellow-owners/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLenis } from 'lenis/react';
import { ArrowLeft, Check, CircleAlert, Eye } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type FieldPath, FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { SPLIT_ASIDE, SPLIT_COLUMN } from '@/components/auth/auth-classes';
import { Logo } from '@/components/shared/logo';
import { createSpace } from '@/lib/api/studio';
import { signOut, useSession } from '@/lib/auth-client';
import { ApiError } from '@/lib/fetcher';
import { getQueryClient } from '@/lib/query-client';
import { CommunitiesStep, type EditorPreview, FIRST_TILE_ID } from './communities-step';
import { HandleStep, HandleSummary, useHandleAvailability } from './handle-step';
import styles from './onboarding.module.css';
import { cx, Spinner } from './onboarding-fields';
import { OnboardingPreview } from './onboarding-preview';
import {
  clearDraft,
  DEFAULT_VALUES,
  HOST,
  handleFromName,
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
import { usePlatformImport } from './platform-import';
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
  // Retry runs the same submit; this only decides which button shows the spinner.
  const [retrying, setRetrying] = useState(false);
  const [problem, setProblem] = useState<SubmitProblem | null>(null);
  // Counts failed creates in a row, so a second failure reads differently and is announced again.
  const [failures, setFailures] = useState(0);
  const alertActionRef = useRef<HTMLElement>(null);
  const focusAlertAction = useRef(false);
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
  // The handle chosen on /create-account (Better Auth's username). Google, Apple and Facebook have none.
  const sessionHandle =
    (session.data?.user as { username?: string | null } | undefined)?.username ?? null;
  const [changingHandle, setChangingHandle] = useState(false);
  const imp = usePlatformImport();

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

  // One identity (spec §11): the sign-up handle is the page handle. Without one, suggest one from the
  // name. A restored draft keeps whatever handle it had.
  useEffect(() => {
    if (!restored || session.isPending || getValues('handle')) return;
    const suggested = sessionHandle ?? (sessionName ? handleFromName(sessionName) : null);
    if (suggested) setValue('handle', suggested);
  }, [restored, session.isPending, sessionHandle, sessionName, getValues, setValue]);

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

  // After a failed create, focus lands on the alert's action (Retry, Sign in, Go to dashboard), never on
  // the page: the submit button keeps focus while busy, and the alert stays mounted while Retry runs.
  useEffect(() => {
    if (!focusAlertAction.current || !problem || failures === 0) return;
    focusAlertAction.current = false;
    alertActionRef.current?.focus();
  }, [problem, failures]);

  const goTo = useCallback((next: StepIndex, focus: 'heading' | 'handle' | 'error' = 'heading') => {
    focusAfterStep.current = focus;
    if (focus === 'handle') setChangingHandle(true);
    setEditorPreview(null);
    setProblem(null);
    setFailures(0);
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
    try {
      await createSpace({
        ...data,
        avatarUrl: data.avatarUrl || undefined,
        bio: data.bio?.trim() ? data.bio.trim() : null,
        communities: data.communities.map((c) => ({
          ...c,
          description: c.description?.trim() ? c.description.trim() : undefined,
        })),
      });
      finished.current = true;
      setProblem(null);
      clearDraft();
      toast('Your space is live', { description: `${HOST}/${data.handle}` });
      router.push('/dashboard');
    } catch (error) {
      setSubmitting(false);
      setRetrying(false);
      onCreateError(error, data.handle);
    }
  }

  function showProblem(next: SubmitProblem) {
    setProblem(next);
    setFailures((n) => n + 1);
    focusAlertAction.current = true;
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
          else {
            setProblem(null);
            focusFirstError();
          }
          return;
        }
      }
      if (error.status === 401) {
        showProblem('session');
        return;
      }
      if (error.status === 409 || error.code === 'conflict') {
        showProblem('exists');
        return;
      }
    }
    showProblem('unavailable');
  }

  function onInvalid(errors: Record<string, unknown>) {
    setRetrying(false);
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
    getQueryClient().clear();
    router.push('/');
  }

  // Step 1 is one line when the sign-up handle is free (or already theirs) and a name is set.
  const summary =
    step === 0 &&
    !changingHandle &&
    sessionHandle !== null &&
    handle === sessionHandle &&
    !getFieldState('handle').error &&
    displayNameSchema.safeParse(values.displayName ?? '').success &&
    (handleStatus.state === 'checking' ||
      handleStatus.state === 'available' ||
      handleStatus.state === 'unavailable');
  // Until the session answers, step 1 does not know which of the two to show.
  const waitingForSession = step === 0 && session.isPending;
  const meta = summary
    ? {
        title: 'Your link is ready',
        helper: 'It’s the handle you signed up with. Continue, or change it here.',
      }
    : STEPS[step];

  return (
    <FormProvider {...form}>
      {/* SplitFrame's two grid items (page.tsx): the form column and the live preview. */}
      <div className={cx(SPLIT_COLUMN, styles.root, 'max-w-[34rem]')}>
        <header className="flex h-16 items-center">
          <Link
            href="/"
            aria-label="Fellow Owners home"
            className="inline-flex h-11 items-center rounded-full"
          >
            <Logo />
          </Link>
        </header>
        <main id="main" tabIndex={-1} className="glass-strong mt-4 p-5 outline-none sm:p-8">
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
            {/* Below 1024px the preview sits under the form, so a jump to it shares the dots' line. */}
            <div className="flex min-h-11 items-center justify-between gap-3">
              <ProgressDots step={step} />
              <a
                href="#onboarding-preview"
                className={cx(
                  styles.press,
                  'inline-flex h-11 items-center gap-1.5 rounded-full border border-line px-4 text-small-strong text-ink hover:bg-page lg:hidden',
                )}
              >
                <Eye aria-hidden strokeWidth={1.5} className="size-4" />
                Preview
              </a>
            </div>
            <h1
              ref={headingRef}
              id="ob-step-title"
              tabIndex={-1}
              className={cx(
                styles.stepHeading,
                'mt-4 text-h1 text-balance text-ink sm:text-display',
              )}
            >
              {meta.title}
            </h1>
            <p className="mt-2 max-w-[46ch] text-body text-pretty text-ink-soft">{meta.helper}</p>

            <div key={step} className={cx(styles.stepEnter, 'mt-8')}>
              {waitingForSession ? (
                <div
                  aria-busy
                  className="flex min-h-24 items-center gap-2 text-small text-ink-muted"
                >
                  <Spinner className="size-3.5" />
                  Loading your account
                </div>
              ) : summary ? (
                <HandleSummary
                  handle={handle}
                  name={values.displayName.trim()}
                  checking={handleStatus.state === 'checking'}
                  onChange={() => {
                    focusAfterStep.current = 'handle';
                    setChangingHandle(true);
                  }}
                />
              ) : step === 0 ? (
                <HandleStep status={handleStatus} handleInputRef={handleInputRef} />
              ) : null}
              {step === 1 ? <PlatformsStep imp={imp} /> : null}
              {step === 2 ? <CommunitiesStep onEditorPreview={setEditorPreview} imp={imp} /> : null}
              {step === 3 ? <TasteStep imp={imp} /> : null}
            </div>

            {problem ? (
              <SubmitAlert
                problem={problem}
                again={failures > 1}
                actionRef={alertActionRef}
                onRetry={() => {
                  if (submitting) return;
                  setRetrying(true);
                  formRef.current?.requestSubmit();
                }}
                retrying={retrying && submitting}
              />
            ) : null}

            {/* Busy and unavailable buttons stay focusable (presses are ignored), so focus never drops to
                the page while the space is created. The step's one coral button: Continue, then Create. */}
            <div className="mt-8 flex items-center gap-3">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!submitting) back();
                  }}
                  aria-disabled={submitting || undefined}
                  className="btn btn-secondary shrink-0 px-5"
                >
                  <ArrowLeft aria-hidden strokeWidth={1.5} className="size-4" />
                  Back
                </button>
              ) : null}
              <button
                type="submit"
                aria-busy={(submitting && !retrying) || undefined}
                className={cx(
                  'btn btn-primary ml-auto min-w-0 flex-1 sm:min-w-[11rem] sm:flex-none',
                  submitting && 'cursor-progress',
                )}
              >
                {submitting && !retrying ? <Spinner /> : null}
                {step === LAST_STEP ? 'Create my space' : 'Continue'}
              </button>
            </div>
          </form>
        </main>
        {/* On the bare aurora, so every word is ink. */}
        <footer className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-6 text-small text-ink">
          <span className="inline-flex items-center gap-1.5">
            <Check aria-hidden strokeWidth={1.5} className="size-4" />
            Saved on this device as you go
          </span>
          <span className="inline-flex flex-wrap items-center gap-x-1.5">
            {sessionEmail ? <span className="break-all">Signed in as {sessionEmail}.</span> : null}
            <button
              type="button"
              onClick={onSignOut}
              className="-mx-1 inline-flex min-h-11 items-center rounded-full px-1 font-medium text-ink underline-offset-4 hover:underline"
            >
              Sign out
            </button>
          </span>
        </footer>
      </div>
      <div className={cx(SPLIT_ASIDE, styles.root)}>
        <OnboardingPreview values={values} step={step} editor={editorPreview} />
      </div>
    </FormProvider>
  );
}

/**
 * DESIGN.md Join progress: the current step a 24 by 8px ink pill, done steps 8px ink dots, upcoming
 * 8px Field Grey dots (3.3:1), and "Step n of 4" in Small ink-muted beside them. The dot group carries
 * the same text as its label, so the visible copy is hidden from screen readers rather than read twice.
 */
function ProgressDots({ step }: { step: StepIndex }) {
  const text = `Step ${step + 1} of ${STEPS.length}`;
  return (
    <div className="flex items-center gap-3">
      <div role="img" aria-label={text} className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <span
            key={s.key}
            className={cx(
              'h-2 rounded-full',
              i === step ? 'w-6 bg-ink' : i < step ? 'w-2 bg-ink' : 'w-2 bg-(--line-field)',
            )}
          />
        ))}
      </div>
      <p aria-hidden className="text-small text-ink-muted">
        {text}
      </p>
    </div>
  );
}

function SubmitAlert({
  problem,
  again,
  actionRef,
  onRetry,
  retrying,
}: {
  problem: SubmitProblem;
  /** A second failure in a row: the words change, so the alert is announced again. */
  again: boolean;
  actionRef: React.RefObject<HTMLElement | null>;
  onRetry: () => void;
  retrying: boolean;
}) {
  const copy: Record<SubmitProblem, { title: string; body: string }> = {
    unavailable: {
      title: again
        ? 'We still couldn’t create your space.'
        : 'We couldn’t create your space right now.',
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
  const actionClass = 'btn btn-secondary h-11 shrink-0 self-start px-4 sm:h-10 sm:self-auto';
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
          ref={actionRef as React.RefObject<HTMLButtonElement | null>}
          type="button"
          // Busy, it stays focusable and ignores presses, so focus stays put through the retry.
          onClick={retrying ? undefined : onRetry}
          aria-busy={retrying || undefined}
          className={cx(actionClass, retrying && 'cursor-progress')}
        >
          {retrying ? <Spinner /> : null}
          Retry
        </button>
      ) : problem === 'session' ? (
        <Link
          ref={actionRef as React.RefObject<HTMLAnchorElement | null>}
          href="/login?returnTo=%2Fonboarding"
          className={actionClass}
        >
          Sign in
        </Link>
      ) : (
        <Link
          ref={actionRef as React.RefObject<HTMLAnchorElement | null>}
          href="/dashboard"
          className={actionClass}
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
