'use client';

import { LIMITS } from '@fellow-owners/shared';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { GlassPanel } from '@/components/shared/glass-panel';
import { Button } from '@/components/ui/button';
import { Field, TextField } from '@/components/ui/field';
import { useAsk } from '@/hooks/queries/use-ask';
import { ApiError } from '@/lib/fetcher';
import { pluralize } from '@/lib/format';
import { errorMessage } from '@/lib/toast';

/**
 * Ask your AI (F13) on Today: one question about the space, answered only from the nearest posts
 * and pitches, with each source as a chip linking to it in the dashboard.
 */
export function AskCard() {
  const [question, setQuestion] = useState('');
  const ask = useAsk();
  const answer = ask.data;
  const capped = ask.error instanceof ApiError && ask.error.code === 'daily_cap_reached';
  const left = capped ? 0 : answer?.asksLeftToday;
  const trimmed = question.trim();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trimmed.length < 3 || ask.isPending) return;
    ask.mutate({ question: trimmed });
  }

  return (
    <GlassPanel as="section" aria-labelledby="ask-card-title" className="p-5">
      <h2 id="ask-card-title" className="text-label text-ink">
        Ask your AI
      </h2>
      <p className="mt-1 text-small text-ink-soft">
        Answers come only from what your fans posted and pitched.
      </p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
        <Field
          label={<span className="sr-only">Your question</span>}
          error={ask.error && !capped ? errorMessage(ask.error) : undefined}
        >
          <TextField
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={LIMITS.ask.questionMax}
            placeholder="What do fans want next?"
          />
        </Field>
        <Button
          type="submit"
          variant="secondary"
          size="md"
          surface="glass"
          icon={<Sparkles aria-hidden="true" />}
          loading={ask.isPending}
          disabled={trimmed.length < 3 || left === 0}
          className="self-start"
        >
          Ask
        </Button>
      </form>
      <div aria-live="polite">
        {answer && !ask.isPending ? (
          <div className="mt-4 flex flex-col gap-3">
            <p className="whitespace-pre-line text-body text-ink">{answer.answer}</p>
            {answer.citations.length > 0 ? (
              <ol className="flex flex-wrap gap-2">
                {answer.citations.map((citation, index) => (
                  <li key={`${citation.refType}:${citation.refId}`}>
                    <Link
                      href={citation.href}
                      className="glass-chip inline-flex h-8 max-w-60 items-center gap-1.5 rounded-full px-3 text-small text-ink hover:bg-white/90"
                    >
                      <span className="text-ink-soft">[{index + 1}]</span>
                      <span className="truncate">{citation.title}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        ) : null}
        {left !== undefined ? (
          <p className="mt-3 text-small text-ink-soft">
            {left === 0
              ? "You've used today's questions. More tomorrow."
              : `${left} ${pluralize(left, 'question')} left today`}
          </p>
        ) : null}
      </div>
    </GlassPanel>
  );
}
