'use client';

import {
  type ImportResult,
  type ImportSuggestion,
  LIMITS,
  type StudioCommunity,
} from '@fellow-owners/shared';
import { Check, ClipboardPaste, FileText, Link2, Plus, Sparkles, Upload } from 'lucide-react';
import type * as React from 'react';
import { useId, useState } from 'react';
import type { YoutubeImportResult } from '@/api/followers';
import { SegmentedPill } from '@/components/shared/segmented-pill';
import { SidePanel } from '@/components/shared/side-panel';
import { TINT_ROTATION } from '@/components/shared/tint';
import { Button } from '@/components/ui/button';
import { Field, FieldError, TextArea, TextField } from '@/components/ui/field';
import { useCreateCommunity } from '@/hooks/queries/use-communities';
import { useImportFollowers, useImportYoutube } from '@/hooks/queries/use-followers';
import { formatNumber, pluralize } from '@/lib/format';
import { errorMessage, toastSuccess } from '@/lib/toast';

type Source = 'paste' | 'csv' | 'youtube';
type Result = ImportResult | YoutubeImportResult;

const F = LIMITS.follower;
const C = LIMITS.community;
const SHOWN_ERRORS = 10;

const SOURCES = [
  { value: 'paste', label: 'Paste', icon: ClipboardPaste },
  { value: 'csv', label: 'CSV file', icon: FileText },
  { value: 'youtube', label: 'YouTube', icon: Link2 },
] as const;

const EXAMPLES: Record<Exclude<Source, 'youtube'>, { lead: string; sample: string }> = {
  paste: {
    lead: 'One follower per line: a name, @handle or email, then what they said after a dash, colon or tab.',
    sample:
      'Priya Shah @priya.wanders - wants a Lisbon guide under $60 a day\nsam@example.com: more street food and film photography please',
  },
  csv: {
    lead: 'A header row with name, handle or email; platform and note are optional. Other columns are ignored.',
    sample:
      'name,handle,platform,email,note\nPriya Shah,@priya.wanders,instagram,,wants a Lisbon guide under $60 a day',
  },
};

function Summary({ result }: { result: Result }) {
  const { created, duplicates, skipped, errors } = result;
  return (
    <div className="flex flex-col gap-2">
      {'sample' in result && result.sample ? (
        <p className="self-start rounded-full bg-white/70 px-3 py-1 text-caption text-ink-soft">
          Sample data: no YouTube key is set, so these commenters are made up.
        </p>
      ) : null}
      <p className="text-label-strong text-ink">
        Added {formatNumber(created)} {pluralize(created, 'follower')}.
      </p>
      <ul className="flex flex-col gap-0.5 text-small text-ink-soft">
        <li>
          {formatNumber(duplicates)} {pluralize(duplicates, 'duplicate')} already on your list
        </li>
        <li>
          {formatNumber(skipped)} {pluralize(skipped, 'row')} skipped
        </li>
      </ul>
      {errors.length ? (
        <ul className="flex flex-col gap-0.5 rounded-xl bg-white/60 px-4 py-3 text-small text-ink-soft">
          {errors.slice(0, SHOWN_ERRORS).map((error) => (
            <li key={`${error.line}-${error.reason}`}>
              <span className="text-ink tabular-nums">Line {error.line}:</span> {error.reason}
            </li>
          ))}
          {skipped > Math.min(errors.length, SHOWN_ERRORS) ? (
            <li className="text-ink-soft">
              and {formatNumber(skipped - Math.min(errors.length, SHOWN_ERRORS))} more{' '}
              {pluralize(skipped - Math.min(errors.length, SHOWN_ERRORS), 'row')}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  created,
  pending,
  onCreate,
}: {
  suggestion: ImportSuggestion;
  created: boolean;
  pending: boolean;
  onCreate: () => void;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-xl bg-white/60 p-4">
      <p className="text-label-strong text-ink">{suggestion.name}</p>
      {suggestion.description ? (
        <p className="text-small text-ink-soft">{suggestion.description}</p>
      ) : null}
      {suggestion.sampleQuotes.length ? (
        <ul className="flex flex-col gap-1">
          {suggestion.sampleQuotes.slice(0, 3).map((quote) => (
            <li key={quote} className="border-l-2 border-line pl-3 text-small text-ink-soft">
              “{quote}”
            </li>
          ))}
        </ul>
      ) : null}
      <Button
        variant="secondary"
        surface="card"
        size="md"
        icon={created ? <Check /> : <Plus />}
        loading={pending}
        disabled={created}
        onClick={onCreate}
        className="self-start"
      >
        {created ? 'Community created' : 'Create community'}
      </Button>
    </li>
  );
}

export interface ImportPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communities: StudioCommunity[];
  /** Runs auto-tag on untagged followers (the screen toasts the outcome). */
  onAutoTag: () => void;
  autoTagging?: boolean;
}

/**
 * Import followers (F23) in the side panel: paste lines or pick a CSV file (read here, as text), see
 * what was added, skipped and why, then the communities the AI proposes from the notes, each created
 * only on the creator's click.
 */
export function ImportPanel({
  open,
  onOpenChange,
  communities,
  onAutoTag,
  autoTagging,
}: ImportPanelProps) {
  const formId = useId();
  const fileId = useId();
  const importer = useImportFollowers();
  const youtubeImporter = useImportYoutube();
  const create = useCreateCommunity();
  const [source, setSource] = useState<Source>('paste');
  const [pasted, setPasted] = useState('');
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [channelUrl, setChannelUrl] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [made, setMade] = useState<string[]>([]);
  const [making, setMaking] = useState<string | null>(null);

  function reset() {
    setSource('paste');
    setPasted('');
    setFile(null);
    setProblem(null);
    setResult(null);
    setMade([]);
    setChannelUrl('');
    importer.reset();
    youtubeImporter.reset();
  }

  const text = source === 'paste' ? pasted : (file?.text ?? '');

  async function readFile(picked: File | undefined) {
    setProblem(null);
    if (!picked) return setFile(null);
    const content = await picked.text();
    if (content.length > F.importChars) {
      setFile(null);
      setProblem(
        `That file is over ${formatNumber(F.importChars)} characters. Split it and import each part.`,
      );
      return;
    }
    setFile({ name: picked.name, text: content });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (source === 'youtube') {
      if (!channelUrl.trim()) {
        setProblem('Paste a YouTube channel link.');
        return;
      }
      setProblem(null);
      try {
        setResult(await youtubeImporter.mutateAsync({ channelUrl: channelUrl.trim() }));
      } catch {
        // shown below from youtubeImporter.error
      }
      return;
    }
    if (!text.trim()) {
      setProblem(source === 'paste' ? 'Paste at least one follower.' : 'Choose a CSV file.');
      return;
    }
    if (text.length > F.importChars) {
      setProblem(`Up to ${formatNumber(F.importChars)} characters at a time.`);
      return;
    }
    setProblem(null);
    try {
      setResult(await importer.mutateAsync({ source, text }));
    } catch {
      // shown below from importer.error
    }
  }

  function createSuggested(suggestion: ImportSuggestion) {
    const live = communities.filter((c) => !c.archivedAt).length;
    setMaking(suggestion.name);
    create.mutate(
      {
        name: suggestion.name.slice(0, C.name.max),
        description: suggestion.description.slice(0, C.description.max) || undefined,
        tint: TINT_ROTATION[(live + made.length) % TINT_ROTATION.length],
        icon: 'users',
      },
      {
        onSuccess: () => {
          setMade((now) => [...now, suggestion.name]);
          toastSuccess(`${suggestion.name} is ready. Tag followers into it from the list.`);
        },
        onSettled: () => setMaking(null),
      },
    );
  }

  const failure =
    problem ??
    (importer.isError ? errorMessage(importer.error) : null) ??
    (youtubeImporter.isError ? errorMessage(youtubeImporter.error) : null);
  const example = source === 'youtube' ? null : EXAMPLES[source];

  return (
    <SidePanel
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title="Import followers"
      footer={
        result ? (
          <>
            <Button variant="secondary" icon={<Upload />} onClick={reset}>
              Import more
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Done
            </Button>
          </>
        ) : (
          <Button
            type="submit"
            form={formId}
            icon={<Upload />}
            loading={importer.isPending || youtubeImporter.isPending}
            className="flex-1"
          >
            Import followers
          </Button>
        )
      }
    >
      {/* The outcome is announced when it appears. */}
      <div aria-live="polite">{result ? <Summary result={result} /> : null}</div>
      <div className="flex flex-col gap-6 not-empty:mt-6">
        {result ? (
          <>
            {result.created > 0 ? (
              <div className="flex flex-col items-start gap-2">
                <p className="text-small text-ink-soft">
                  Let the AI sort untagged followers into your communities from their notes. You can
                  review every tag.
                </p>
                <Button
                  variant="secondary"
                  size="md"
                  icon={<Sparkles />}
                  loading={autoTagging}
                  onClick={onAutoTag}
                >
                  Auto-tag with AI
                </Button>
              </div>
            ) : null}
            {result.suggestions.length ? (
              <section className="flex flex-col gap-3">
                <h3 className="text-label-strong text-ink">Communities the AI suggests</h3>
                <p className="text-small text-ink-soft">
                  Grouped from what your followers said. Nothing is created until you choose.
                </p>
                <ul className="flex flex-col gap-3">
                  {result.suggestions.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.name}
                      suggestion={suggestion}
                      created={made.includes(suggestion.name)}
                      pending={making === suggestion.name}
                      onCreate={() => createSuggested(suggestion)}
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}
      </div>

      {result ? null : (
        <form
          id={formId}
          noValidate
          aria-label="Import followers"
          onSubmit={submit}
          className="flex flex-col gap-5"
        >
          <SegmentedPill
            label="Import from"
            options={SOURCES}
            value={source}
            onChange={(next) => {
              setSource(next);
              setProblem(null);
            }}
            className="self-start"
          />

          {example ? (
            <div className="flex flex-col gap-2 rounded-xl bg-white/60 px-4 py-3">
              <p className="text-small text-ink-soft">{example.lead}</p>
              <pre className="overflow-x-auto text-caption whitespace-pre text-ink">
                {example.sample}
              </pre>
              <p className="text-caption text-ink-soft">
                Up to {formatNumber(F.importRows)} rows at a time. Duplicates are skipped.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-xl bg-white/60 px-4 py-3">
              <p className="text-small text-ink-soft">
                Paste your channel link. We read the comments on your latest{' '}
                {LIMITS.youtube.maxVideos} videos (up to {formatNumber(LIMITS.youtube.maxComments)}{' '}
                comments) and add each commenter with what they said. Duplicates are skipped.
              </p>
            </div>
          )}

          {source === 'youtube' ? (
            <Field label="Channel link" helper="For example youtube.com/@yourchannel">
              <TextField
                type="url"
                value={channelUrl}
                onChange={(event) => setChannelUrl(event.target.value)}
                placeholder="https://www.youtube.com/@yourchannel"
                spellCheck={false}
                autoComplete="off"
              />
            </Field>
          ) : source === 'paste' ? (
            <Field label="Followers" count={{ value: pasted.length, max: F.importChars }}>
              <TextArea
                value={pasted}
                onChange={(event) => setPasted(event.target.value)}
                rows={10}
                spellCheck={false}
              />
            </Field>
          ) : (
            <Field
              label="CSV file"
              id={fileId}
              helper={
                file
                  ? `${file.name} is ready to import.`
                  : 'Read on this device, then sent as text.'
              }
            >
              <input
                id={fileId}
                aria-describedby={`${fileId}-helper`}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={(event) => void readFile(event.target.files?.[0])}
                className="min-h-11 text-body text-ink file:mr-3 file:h-10 file:cursor-pointer file:rounded-full file:border file:border-line file:bg-white file:px-4 file:text-label file:text-ink hover:file:bg-page"
              />
            </Field>
          )}
        </form>
      )}

      <FieldError className="mt-3">{failure}</FieldError>
    </SidePanel>
  );
}
