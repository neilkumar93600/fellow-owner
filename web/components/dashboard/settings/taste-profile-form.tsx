'use client';

import {
  LIMITS,
  type StudioSpace,
  type TasteProfile,
  tasteProfileSchema,
} from '@fellow-owners/shared';
import { Check, Plus, X } from 'lucide-react';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldError, TextArea, TextField } from '@/components/ui/field';
import { useUpdateSettings } from '@/hooks/queries/use-settings';
import { issuesByPath } from './profile-form';

type ListKey = keyof TasteProfile;
type Line = { id: number; text: string };
type Lines = Record<ListKey, Line[]>;

const T = LIMITS.tasteProfile;

const LISTS: {
  name: ListKey;
  title: string;
  helper: string;
  item: string;
  min: number;
  max: number;
  lineMax: number;
}[] = [
  {
    name: 'promote',
    title: 'What you love',
    helper: `${T.promote.min} to ${T.promote.max} lines. A match raises an idea's match and becomes the reason you read.`,
    item: 'Love line',
    min: T.promote.min,
    max: T.promote.max,
    lineMax: T.lineMax,
  },
  {
    name: 'never',
    title: 'Never for me',
    helper: `Up to ${T.never.max} lines. A match pulls the match down and says which line it hit.`,
    item: 'Never line',
    min: T.never.min,
    max: T.never.max,
    lineMax: T.lineMax,
  },
  {
    name: 'voice',
    title: 'Your voice',
    helper: `Up to ${T.voice.max} things you wrote. Drafts for replies and spotlights use this voice.`,
    item: 'Voice sample',
    min: T.voice.min,
    max: T.voice.max,
    lineMax: T.voiceSampleMax,
  },
];

// Keys only (never rendered), so server and client counters need not agree.
let seq = 0;
const toLines = (list: string[]): Line[] => list.map((text) => ({ id: seq++, text }));

export interface TasteProfileFormProps {
  space: Pick<StudioSpace, 'tasteProfile' | 'tasteVersion'>;
  isPending?: boolean;
}

/**
 * Settings, Taste profile tab: the creator's matching directives for the AI. Three lists with add, remove
 * and a count per line, validated with tasteProfileSchema; wired to the API.
 */
export function TasteProfileForm({ space, isPending = false }: TasteProfileFormProps) {
  const { mutate, isPending: isSaving } = useUpdateSettings();
  const [lines, setLines] = useState<Lines>(() => ({
    promote: toLines(space.tasteProfile.promote),
    never: toLines(space.tasteProfile.never),
    voice: toLines(space.tasteProfile.voice),
  }));
  const version = space.tasteVersion;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusList, setFocusList] = useState<ListKey | null>(null);

  // A new line takes focus once it has rendered.
  useEffect(() => {
    if (!focusList) return;
    document
      .querySelector<HTMLElement>(`[data-list="${focusList}"] li:last-child :is(input, textarea)`)
      ?.focus();
    setFocusList(null);
  }, [focusList]);

  const edit = (key: ListKey, next: Line[]) => {
    setLines((current) => ({ ...current, [key]: next }));
    setErrors({});
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const result = tasteProfileSchema.safeParse({
      promote: lines.promote.map((line) => line.text),
      never: lines.never.map((line) => line.text),
      voice: lines.voice.map((line) => line.text),
    });
    if (!result.success) {
      setErrors(issuesByPath(result.error.issues));
      return;
    }
    setErrors({});
    mutate({
      tasteProfile: result.data,
    });
  };

  return (
    <form
      noValidate
      onSubmit={save}
      aria-labelledby="taste-title"
      className="flex min-w-0 flex-col gap-8 glass-strong rounded-panel p-6"
    >
      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="taste-title" className="text-h2 text-ink">
            Your taste
          </h2>
          <p className="text-small text-ink-muted">Version {version}</p>
        </div>
        <p className="mt-2 max-w-[68ch] text-body text-ink">
          Your AI reads these lines before it rates an idea or a message, so it judges the way you
          would. Every match you see quotes the line that moved it. Your voice samples teach it to
          draft in your words, and it never sends anything without your click.
        </p>
      </div>

      <div className="grid gap-8 @5xl:grid-cols-2">
        {LISTS.slice(0, 2).map((list) => (
          <LineList
            key={list.name}
            {...list}
            lines={lines[list.name]}
            errors={errors}
            onChange={(next) => edit(list.name, next)}
            onAdd={() => {
              edit(list.name, [...lines[list.name], ...toLines([''])]);
              setFocusList(list.name);
            }}
          />
        ))}
      </div>
      <LineList
        {...LISTS[2]}
        multiline
        lines={lines.voice}
        errors={errors}
        onChange={(next) => edit('voice', next)}
        onAdd={() => {
          edit('voice', [...lines.voice, ...toLines([''])]);
          setFocusList('voice');
        }}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-row pt-6">
        <Button type="submit" icon={<Check />} disabled={isSaving || isPending}>
          {isSaving ? 'Saving...' : 'Save my taste'}
        </Button>
        <p className="max-w-[60ch] text-small text-ink-muted">
          Saving starts version {version + 1}. Items rated earlier say so until you rescore them.
        </p>
      </div>
    </form>
  );
}

function LineList({
  name,
  title,
  helper,
  item,
  min,
  max,
  lineMax,
  multiline = false,
  lines,
  errors,
  onChange,
  onAdd,
}: (typeof LISTS)[number] & {
  multiline?: boolean;
  lines: Line[];
  errors: Record<string, string>;
  onChange: (lines: Line[]) => void;
  onAdd: () => void;
}) {
  const full = lines.length >= max;
  const titleId = `taste-${name}-title`;
  const capId = `taste-${name}-cap`;

  return (
    <section aria-labelledby={titleId} data-list={name} className="min-w-0">
      <h3 id={titleId} className="text-label-strong text-ink">
        {title}
      </h3>
      <p className="mt-1 text-small text-ink-muted">{helper}</p>
      <FieldError>{errors[name]}</FieldError>

      {lines.length > 0 ? (
        <ol className="mt-4 flex flex-col gap-3">
          {lines.map((line, index) => {
            const change = (text: string) =>
              onChange(lines.map((l) => (l.id === line.id ? { ...l, text } : l)));
            return (
              <li key={line.id} className="flex items-start gap-2">
                <Field
                  label={
                    <span className="sr-only">
                      {item} {index + 1}
                    </span>
                  }
                  count={{ value: line.text.length, max: lineMax }}
                  error={errors[`${name}.${index}`]}
                  className="min-w-0 flex-1"
                >
                  {multiline ? (
                    <TextArea
                      value={line.text}
                      rows={3}
                      onChange={(event) => change(event.target.value)}
                    />
                  ) : (
                    <TextField value={line.text} onChange={(event) => change(event.target.value)} />
                  )}
                </Field>
                <Button
                  variant="ghost"
                  surface="white"
                  className="mt-2 text-ink-soft"
                  aria-label={`Remove ${item.toLowerCase()} ${index + 1}`}
                  disabled={lines.length <= min}
                  onClick={() => onChange(lines.filter((l) => l.id !== line.id))}
                >
                  <X />
                </Button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 text-body text-ink">None yet.</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button
          variant="secondary"
          size="md"
          icon={<Plus />}
          disabled={full}
          aria-describedby={full ? capId : undefined}
          onClick={onAdd}
        >
          {multiline ? 'Add a sample' : 'Add a line'}
        </Button>
        {full ? (
          <p id={capId} className="text-small text-ink-muted">
            That is the most this list holds.
          </p>
        ) : null}
      </div>
    </section>
  );
}
