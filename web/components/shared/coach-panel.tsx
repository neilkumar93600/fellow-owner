'use client';

import { type CoachResult, LIMITS } from '@fellow-owners/shared';
import { ChevronDown, Circle, CircleCheck, Sparkles } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Skeleton } from '@/components/ui/skeleton';

type Draft = { subject: string; body: string };
type Status = 'idle' | 'loading' | 'ready' | 'unavailable';

export interface CoachPanelProps {
  /** 'pitch' checks a pitch to the creator; 'post' an Idea or Project post. */
  kind: 'pitch' | 'post';
  creatorName: string;
  /** The fields as typed now. */
  draft: Draft;
  /** Puts a version into the form (the suggestion, or the fan's own text again on Undo). */
  onReplace: (next: Draft) => void;
  /** Design phase: the captured coach answer. Wiring swaps this for POST /api/spaces/:handle/coach. */
  sample: CoachResult;
  className?: string;
}

/**
 * F30 Idea Coach. On demand only: a secondary "Check my pitch" under the body (Send stays the one
 * coral), then an inset lavender well with a clarity checklist and an optional rewrite. It judges
 * clarity, never taste: no score, no "Mira would like this", and nothing here reaches the creator.
 */
export function CoachPanel({
  kind,
  creatorName,
  draft,
  onReplace,
  sample,
  className,
}: CoachPanelProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<CoachResult | null>(null);
  const [checked, setChecked] = useState<Draft | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [checksLeft, setChecksLeft] = useState<number>(LIMITS.coach.perDay);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const noteId = useId();
  const suggestionId = useId();

  const tooShort = draft.body.trim().length < LIMITS.coach.minBodyChars;
  const edited =
    checked !== null && (checked.subject !== draft.subject || checked.body !== draft.body);
  const noun = kind === 'pitch' ? 'pitch' : 'idea';

  useEffect(() => {
    if (status === 'ready') headingRef.current?.focus();
  }, [status]);

  function check() {
    setStatus('loading');
    setShowSuggestion(false);
    // Design phase: a short pause stands in for the AI call.
    window.setTimeout(() => {
      setResult(sample);
      setChecked(draft);
      setChecksLeft(Math.min(sample.checksLeftToday, checksLeft - 1));
      setStatus('ready');
    }, 900);
  }

  function applySuggestion(next: Draft) {
    const previous = draft;
    onReplace(next);
    setShowSuggestion(false);
    toast.success('Suggested version in place', {
      action: { label: 'Undo', onClick: () => onReplace(previous) },
    });
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button
          type="button"
          variant="secondary"
          icon={<Sparkles />}
          loading={status === 'loading'}
          disabled={tooShort || checksLeft <= 0}
          aria-describedby={noteId}
          onClick={check}
        >
          {edited ? 'Check again' : `Check my ${noun}`}
        </Button>
        <p id={noteId} className="text-small text-ink-muted">
          {checksLeft <= 0
            ? 'Checks reset tomorrow.'
            : tooShort
              ? 'Write a little more, then the coach can check it.'
              : `Tips on clarity from the AI coach. ${creatorName} never sees them.`}
          {checksLeft > 0 && checksLeft <= 3 ? ` ${checksLeft} checks left today.` : ''}
        </p>
      </div>

      {status === 'loading' ? (
        <div aria-busy="true" className="flex flex-col gap-3 rounded-lg bg-lavender p-4">
          <span className="sr-only" role="status">
            Checking your {noun}
          </span>
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : null}

      {status === 'unavailable' ? (
        <p className="rounded-lg bg-lavender p-4 text-body text-ink">
          The coach is unavailable right now. Your {noun} is fine to send as is.
        </p>
      ) : null}

      {status === 'ready' && result ? (
        // The summary-well pattern: an inset on the form card, not a card in a card.
        <section aria-labelledby={`${noteId}-tips`} className="rounded-lg bg-lavender p-4">
          <h3
            id={`${noteId}-tips`}
            ref={headingRef}
            tabIndex={-1}
            className="text-small-strong text-ink outline-none"
          >
            Coach tips{' '}
            <span className="font-normal text-ink-soft">· {creatorName} never sees these</span>
          </h3>
          <ul className="mt-3 flex flex-col gap-2.5">
            {result.checks.map((item) => (
              <li key={item.key} className="flex items-start gap-2.5">
                {item.ok ? (
                  <CircleCheck
                    aria-hidden="true"
                    strokeWidth={1.75}
                    className="mt-0.5 size-4 shrink-0 text-success-ink"
                  />
                ) : (
                  <Circle
                    aria-hidden="true"
                    strokeWidth={1.75}
                    className="mt-0.5 size-4 shrink-0 text-ink-soft"
                  />
                )}
                <p className="min-w-0 text-small text-ink">
                  <span className="text-small-strong">{item.label}</span>
                  <span className="sr-only">{item.ok ? ': covered.' : ': missing.'}</span>{' '}
                  {item.ok && item.found ? (
                    <span className="text-ink-soft">“{item.found}”</span>
                  ) : (
                    item.tip
                  )}
                </p>
              </li>
            ))}
          </ul>

          {result.suggestion ? (
            <div className="mt-4 border-t border-lavender-tile pt-3">
              <button
                type="button"
                aria-expanded={showSuggestion}
                aria-controls={suggestionId}
                onClick={() => setShowSuggestion((open) => !open)}
                className="press -mx-2 inline-flex h-11 items-center gap-1.5 rounded-full px-2 text-small-strong text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'size-4 transition-transform duration-150',
                    showSuggestion && 'rotate-180',
                  )}
                />
                Suggested version
              </button>
              <div id={suggestionId} hidden={!showSuggestion} className="mt-1">
                <p className="text-small-strong text-ink">{result.suggestion.subject}</p>
                <p className="mt-1 max-w-[68ch] text-small whitespace-pre-line text-ink">
                  {result.suggestion.body}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => result.suggestion && applySuggestion(result.suggestion)}
                  >
                    Use this version
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    surface="card"
                    onClick={() => setShowSuggestion(false)}
                  >
                    Keep mine
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
