'use client';

import {
  LIMITS,
  LOOKUP_PLATFORMS,
  PLATFORM_LABELS,
  type Platform,
  type PlatformEntry,
  type PlatformFansImport,
  type PlatformLookupFailure,
  type PlatformLookupResult,
  type PlatformProfile,
} from '@fellow-owners/shared';
import { ArrowRight, CircleAlert, Globe, Plus, RefreshCw, Users, X } from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { PlatformIcon } from '@/components/auth/platform-icons';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { FieldError, Helper, Label, TextField } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { ApiError } from '@/lib/fetcher';
import { formatCompact, formatNumber, formatRelative, pluralize } from '@/lib/format';
import { lookupPlatform, parseFollowers, readProfileLink } from '@/lib/platform-client';
import { routes } from '@/lib/routes';

/*
 * Connect platforms by link (owner request 2026-10-12): paste a profile link, Add, and a card appears at
 * once; lookups run one at a time in the order added, so the next link can go in while one fetches.
 * A ready card is a saved entry (`value`); fetching, failed and count-needed cards live here until they
 * become one. Onboarding and Settings, Profile both use it.
 */

const MAX = LIMITS.space.platforms.max;
/** Platforms whose recent comments the API can import as fans. */
const FAN_PLATFORMS: readonly Platform[] = ['instagram', 'tiktok', 'youtube'];

export type LookupFailure = PlatformLookupFailure | 'busy' | 'daily' | 'hidden';

const FAILURE_TEXT: Record<LookupFailure, string> = {
  private: 'This account is private',
  not_found: 'We couldn’t find this profile',
  unavailable: 'We couldn’t read it right now',
  unsupported: 'Use an Instagram, TikTok, YouTube or X profile link',
  busy: 'Too many lookups. Try again in a minute',
  daily: 'Profile lookups are used up for today. Try again tomorrow',
  hidden: 'This profile hides its follower count',
};

type SkipReason = Extract<PlatformFansImport, { status: 'skipped' }>['reason'];

const SKIP_TEXT: Record<SkipReason, string> = {
  unsupported: 'Comments from this platform can’t be imported yet.',
  sample: 'This is sample data, so there are no real comments to import.',
  private: 'This account is private, so its comments can’t be read.',
  not_found: 'We couldn’t find this profile.',
  unavailable: 'We couldn’t read the comments right now. Try again later.',
  no_comments: 'No comments on your recent posts yet.',
};

/** One card's "Import fans from comments" state in Settings: idle, waiting on Save, running, or the answer. */
export type FansImportView =
  | { status: 'idle' }
  | { status: 'unsaved' }
  | { status: 'pending' }
  | { status: 'error'; message: string }
  | PlatformFansImport;

export interface PlatformConnectProps {
  /** The saved platforms, in the order added. Fetching and failed links never enter it. */
  value: PlatformEntry[];
  onChange: (next: PlatformEntry[]) => void;
  /** Each profile a lookup finds (onboarding feeds them to the setup suggestions). */
  onFetched?: (profile: PlatformProfile) => void;
  /** Profiles found before this mount (a restored onboarding draft): avatar, name, Sample data chip. */
  profiles?: readonly PlatformProfile[];
  /** Settings: a Refresh action on fetched cards (re-runs the lookup, updates followers and time). */
  refresh?: boolean;
  /** Settings: "Import fans from comments" on Instagram, TikTok and YouTube cards with a handle. */
  onImportFans?: (entry: PlatformEntry) => void;
  /** Per-card import state, by entry url. Missing means idle. */
  importState?: Record<string, FansImportView>;
}

interface Job {
  id: number;
  /** `add` becomes a new entry; `refresh` updates the entry `target` (its key). */
  kind: 'add' | 'refresh';
  url: string;
  platform: Platform;
  /** Read from the link, for the card while it fetches. */
  handle: string | null;
  /** `manual`: a platform the lookup cannot read, so the creator types the count. */
  status: 'queued' | 'fetching' | 'failed' | 'manual';
  reason?: LookupFailure;
  target?: string;
  /** The "Enter the count yourself" field on a failed card. */
  manualOpen?: boolean;
  count?: string;
  countError?: string;
}

type Who = { platform: Platform; handle?: string | null; url: string };

/** The stored handle, or the one in the link (entries saved before lookups only have a link). */
const handleOf = (e: Who) => e.handle || readProfileLink(e.url)?.handle || null;
const keyOf = (e: Who) => `${e.platform}:${(handleOf(e) || e.url).toLowerCase()}`;
const bareUrl = (url: string) =>
  url
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/+$/, '');
/** "Instagram @miralane", or "Website mysite.com". */
const nameOf = (e: Who) => {
  const handle = handleOf(e);
  return `${PLATFORM_LABELS[e.platform]} ${handle ? `@${handle}` : bareUrl(e.url)}`;
};
const sameAccount = (a: Who, b: Who) => {
  const [ha, hb] = [handleOf(a)?.toLowerCase(), handleOf(b)?.toLowerCase()];
  return a.platform === b.platform && ((ha && ha === hb) || bareUrl(a.url) === bareUrl(b.url));
};

/** DOM id of a card, from the component's id and the card's key. */
const cardDomId = (prefix: string, key: string) =>
  `${prefix}-card-${key.replace(/[^a-z0-9_-]/gi, '-')}`;

type Settled = PlatformLookupResult | { status: 'failed'; reason: LookupFailure };

function failureOf(error: unknown): LookupFailure {
  if (error instanceof ApiError && error.status === 429) {
    return error.code === 'daily_cap_reached' ? 'daily' : 'busy';
  }
  return 'unavailable';
}

export function PlatformConnect({
  value,
  onChange,
  onFetched,
  profiles,
  refresh = false,
  onImportFans,
  importState,
}: PlatformConnectProps) {
  const id = useId();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [found, setFound] = useState<Record<string, PlatformProfile>>({});
  /** Why a Refresh failed, by entry key. */
  const [refreshNotes, setRefreshNotes] = useState<Record<string, string>>({});
  const [live, setLive] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);
  const running = useRef<{ id: number; controller: AbortController } | null>(null);
  const focusNext = useRef<string | null>(null);
  // Lookups settle after this render's props are gone; the latest value is what they add to.
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onFetchedRef = useRef(onFetched);
  onFetchedRef.current = onFetched;

  const inputId = `${id}-link`;
  const cardId = (key: string) => cardDomId(id, key);
  const jobId = (job: Job) => `${id}-job-${job.id}`;
  const adds = jobs.filter((j) => j.kind === 'add');
  const full = value.length + adds.length >= MAX;
  const busy = jobs.some((j) => j.status === 'queued' || j.status === 'fetching');

  // The queue: one lookup at a time, oldest first.
  useEffect(() => {
    if (running.current) return;
    const job = jobs.find((j) => j.status === 'queued');
    if (!job) return;
    const controller = new AbortController();
    running.current = { id: job.id, controller };
    setJobs((list) => list.map((j) => (j.id === job.id ? { ...j, status: 'fetching' } : j)));

    const settle = (result: Settled) => {
      if (controller.signal.aborted) return;
      running.current = null;
      // A card that held focus is replaced by its entry: focus follows it.
      const card = document.getElementById(`${id}-job-${job.id}`);
      const hadFocus = Boolean(card?.contains(document.activeElement));
      const current = valueRef.current;
      const commit = (next: PlatformEntry[]) => {
        valueRef.current = next;
        onChangeRef.current(next);
      };

      if (result.status === 'ready' && result.profile.followers !== null) {
        const p = result.profile;
        const key = keyOf({
          platform: p.platform,
          handle: p.handle,
          url: p.profileUrl,
        });
        const sample = p.source === 'simulated' ? ', sample data' : '';
        const count = `${formatNumber(p.followers ?? 0)} ${pluralize(p.followers ?? 0, 'follower')}`;
        setFound((f) => ({ ...f, [key]: p }));
        setJobs((list) => list.filter((j) => j.id !== job.id));
        if (job.kind === 'refresh') {
          commit(
            current.map((e) =>
              keyOf(e) === job.target
                ? {
                    ...e,
                    followers: p.followers ?? 0,
                    handle: p.handle,
                    fetchedAt: p.fetchedAt,
                  }
                : e,
            ),
          );
          setRefreshNotes(({ [job.target ?? '']: _, ...rest }) => rest);
          setLive(`${nameOf({ ...p, url: p.profileUrl })} refreshed: ${count}${sample}.`);
          return;
        }
        const taken = current.some((e) =>
          sameAccount(e, {
            platform: p.platform,
            handle: p.handle,
            url: p.profileUrl,
          }),
        );
        if (taken) {
          setLive(`${nameOf({ ...p, url: p.profileUrl })} is already on your list.`);
          if (hadFocus) focusNext.current = cardDomId(id, key);
          return;
        }
        commit([
          ...current,
          {
            platform: p.platform,
            url: p.profileUrl,
            followers: p.followers ?? 0,
            handle: p.handle,
            fetchedAt: p.fetchedAt,
          },
        ]);
        onFetchedRef.current?.(p);
        if (hadFocus) focusNext.current = cardDomId(id, key);
        setLive(`${nameOf({ ...p, url: p.profileUrl })} added: ${count}${sample}.`);
        return;
      }

      const reason: LookupFailure = result.status === 'failed' ? result.reason : 'hidden';
      if (job.kind === 'refresh') {
        setJobs((list) => list.filter((j) => j.id !== job.id));
        setRefreshNotes((n) => ({
          ...n,
          [job.target ?? '']: FAILURE_TEXT[reason],
        }));
        setLive(`Couldn’t refresh ${nameOf(job)}. ${FAILURE_TEXT[reason]}.`);
        return;
      }
      setJobs((list) =>
        list.map((j) => (j.id === job.id ? { ...j, status: 'failed', reason } : j)),
      );
      setLive(
        `${nameOf(job)}: ${FAILURE_TEXT[reason]}.${reason === 'unsupported' ? '' : ' Retry,'} or enter the count yourself.`,
      );
    };

    lookupPlatform(job.url, controller.signal)
      .then(settle)
      .catch((err: unknown) => settle({ status: 'failed', reason: failureOf(err) }));
  }, [jobs, id]);

  // Abort the lookup in flight when the cards go away.
  useEffect(() => () => running.current?.controller.abort(), []);

  // Focus moves after the render that makes its target exist.
  useEffect(() => {
    if (!focusNext.current) return;
    const el = document.getElementById(focusNext.current);
    focusNext.current = null;
    el?.focus();
  });

  /** Every card's DOM id, in order, so focus can move to a neighbour when one goes. */
  const order = [...value.map((e) => cardId(keyOf(e))), ...adds.map(jobId)];
  function focusNeighbourOf(domId: string) {
    const i = order.indexOf(domId);
    const rest = order.filter((d) => d !== domId);
    focusNext.current = rest[Math.min(i, rest.length - 1)] ?? inputId;
  }

  function stop(job: Job) {
    if (running.current?.id === job.id) {
      running.current.controller.abort();
      running.current = null;
    }
  }

  function add() {
    const links = text.split(/[\s,]+/).filter(Boolean);
    if (links.length === 0) {
      setError('Paste a profile link first.');
      inputRef.current?.focus();
      return;
    }
    const fresh: Job[] = [];
    let problem: string | null = null;
    let room = MAX - value.length - adds.length;
    for (const raw of links) {
      const link = readProfileLink(raw);
      if (!link) {
        problem ??= 'Paste a full profile link, like https://instagram.com/yourname.';
        continue;
      }
      if ([...value, ...adds, ...fresh].some((e) => sameAccount(e, link))) {
        problem ??= `${nameOf(link)} is already on your list.`;
        continue;
      }
      if (room <= 0) {
        problem ??= `That’s the limit of ${MAX} platforms.`;
        continue;
      }
      room -= 1;
      const fetchable = (LOOKUP_PLATFORMS as readonly string[]).includes(link.platform);
      fresh.push({
        id: nextId.current++,
        kind: 'add',
        url: link.url,
        platform: link.platform,
        handle: link.handle,
        status: fetchable ? 'queued' : 'manual',
      });
    }
    setError(problem);
    if (fresh.length === 0) {
      inputRef.current?.focus();
      return;
    }
    setJobs((list) => [...list, ...fresh]);
    setText('');
    const manual = fresh.filter((j) => j.status === 'manual');
    // A card that cannot fetch needs its count next, so focus goes there; otherwise stay for the next link.
    if (manual.length > 0 && fresh.length === 1) focusNext.current = `${id}-count-${fresh[0]?.id}`;
    setLive(
      fresh
        .map((j) =>
          j.status === 'manual'
            ? `${nameOf(j)} added. Enter its follower count.`
            : `Fetching ${nameOf(j)}.`,
        )
        .join(' '),
    );
  }

  function removeEntry(entry: PlatformEntry) {
    const key = keyOf(entry);
    for (const job of jobs) if (job.target === key) stop(job);
    setJobs((list) => list.filter((j) => j.target !== key));
    const next = valueRef.current.filter((e) => keyOf(e) !== key);
    valueRef.current = next;
    onChange(next);
    focusNeighbourOf(cardId(key));
    setLive(`Removed ${nameOf(entry)}.`);
  }

  function removeJob(job: Job) {
    stop(job);
    setJobs((list) => list.filter((j) => j.id !== job.id));
    focusNeighbourOf(jobId(job));
    setLive(`Removed ${nameOf(job)}.`);
  }

  function patchJob(job: Job, patch: Partial<Job>) {
    setJobs((list) => list.map((j) => (j.id === job.id ? { ...j, ...patch } : j)));
  }

  function retry(job: Job) {
    patchJob(job, { status: 'queued', reason: undefined, manualOpen: false });
    focusNext.current = jobId(job);
  }

  function saveCount(job: Job) {
    const followers = parseFollowers(job.count ?? '');
    if (!Number.isFinite(followers) || followers > 2_000_000_000) {
      patchJob(job, {
        countError: 'Enter followers as a number, like 410K or 410000',
      });
      document.getElementById(`${id}-count-${job.id}`)?.focus();
      return;
    }
    // Typed by hand: no handle or fetch time, so the daily refresh leaves it alone.
    const entry: PlatformEntry = {
      platform: job.platform,
      url: job.url,
      followers,
    };
    const next = [...valueRef.current, entry];
    valueRef.current = next;
    onChange(next);
    setJobs((list) => list.filter((j) => j.id !== job.id));
    focusNext.current = cardId(keyOf(entry));
    setLive(
      `${nameOf(job)} added: ${formatNumber(followers)} ${pluralize(followers, 'follower')}.`,
    );
  }

  function refreshEntry(entry: PlatformEntry) {
    setRefreshNotes(({ [keyOf(entry)]: _, ...rest }) => rest);
    setJobs((list) => [
      ...list,
      {
        id: nextId.current++,
        kind: 'refresh',
        url: entry.url,
        platform: entry.platform,
        handle: handleOf(entry),
        status: 'queued',
        target: keyOf(entry),
      },
    ]);
  }

  const profileOf = (entry: PlatformEntry): PlatformProfile | undefined => {
    if (!handleOf(entry)) return undefined;
    const key = keyOf(entry);
    return (
      found[key] ??
      profiles?.find(
        (p) =>
          keyOf({
            platform: p.platform,
            handle: p.handle,
            url: p.profileUrl,
          }) === key,
      )
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col">
        <Label htmlFor={inputId}>Add a platform</Label>
        <div className="flex gap-2">
          <TextField
            ref={inputRef}
            id={inputId}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              // Inside a form, Enter adds the link instead of submitting.
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="https://instagram.com/yourname"
            disabled={full}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-hint ${id}-error`}
            className="flex-1"
          />
          <Button
            variant="secondary"
            size="md"
            icon={<Plus />}
            onClick={add}
            disabled={full}
            className="h-11"
          >
            Add
          </Button>
        </div>
        <Helper id={`${id}-hint`} className="mt-1.5">
          {full
            ? `That’s the limit of ${MAX} platforms. Remove one to add another.`
            : 'Paste a profile link. We fetch Instagram, TikTok, YouTube and X; for other sites you enter the count.'}
        </Helper>
        <FieldError id={`${id}-error`}>{error}</FieldError>
      </div>

      {value.length + adds.length > 0 ? (
        <ul aria-label="Your platforms" className="flex flex-col gap-2.5">
          {value.map((entry) => {
            const key = keyOf(entry);
            const profile = profileOf(entry);
            const refreshing = jobs.find((j) => j.target === key);
            return (
              <EntryCard
                key={key}
                domId={cardId(key)}
                entry={entry}
                profile={profile}
                refreshing={Boolean(refreshing)}
                refreshNote={refreshNotes[key]}
                onRefresh={
                  refresh &&
                  handleOf(entry) &&
                  (LOOKUP_PLATFORMS as readonly string[]).includes(entry.platform)
                    ? () => refreshEntry(entry)
                    : undefined
                }
                onRemove={() => removeEntry(entry)}
                onImportFans={onImportFans}
                importView={importState?.[entry.url]}
              />
            );
          })}
          {adds.map((job) => (
            <JobCard
              key={job.id}
              domId={jobId(job)}
              countId={`${id}-count-${job.id}`}
              job={job}
              onRemove={() => removeJob(job)}
              onRetry={() => retry(job)}
              onOpenCount={() => {
                patchJob(job, { manualOpen: true });
                focusNext.current = `${id}-count-${job.id}`;
              }}
              onCount={(count) => patchJob(job, { count, countError: undefined })}
              onSaveCount={() => saveCount(job)}
            />
          ))}
        </ul>
      ) : null}
      {busy ? (
        <p className="text-small text-ink-muted">You can add the next link while we fetch.</p>
      ) : null}
      {/* Settled news only: added, failed, removed. */}
      <p role="status" className="sr-only">
        {live}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- cards

/** A platform's own mark, or a globe for any other site. */
export function PlatformMark({ platform, className }: { platform: Platform; className?: string }) {
  return platform === 'other' ? (
    <Globe
      aria-hidden="true"
      strokeWidth={1.5}
      className={cn('size-5 shrink-0 text-ink', className)}
    />
  ) : (
    <PlatformIcon platform={platform} className={className} />
  );
}

/** "Sample data": the lookup made the profile up (no live data source). */
export function SampleChip() {
  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-line bg-white/70 px-2.5 text-caption font-medium text-ink uppercase">
      Sample data
    </span>
  );
}

function CardShell({
  domId,
  labelId,
  media,
  title,
  meta,
  trailing,
  children,
}: {
  domId: string;
  labelId: string;
  media: React.ReactNode;
  title: React.ReactNode;
  meta: React.ReactNode;
  trailing: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <li
      id={domId}
      tabIndex={-1}
      aria-labelledby={labelId}
      className="min-w-0 rounded-3xl border border-line bg-white/60 p-3 outline-offset-2 sm:p-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        {media}
        <div className="min-w-0 flex-1">
          <p id={labelId} className="truncate text-small font-medium text-ink">
            {title}
          </p>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-small text-ink-muted">
            {meta}
          </div>
        </div>
        {trailing}
      </div>
      {children}
    </li>
  );
}

function MarkTile({ platform }: { platform: Platform }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-white">
      <PlatformMark platform={platform} />
    </span>
  );
}

function RemoveButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon-fan"
      className="-mr-1.5 text-ink-soft"
      aria-label={`Remove ${name}`}
      onClick={onClick}
    >
      <X />
    </Button>
  );
}

function EntryCard({
  domId,
  entry,
  profile,
  refreshing,
  refreshNote,
  onRefresh,
  onRemove,
  onImportFans,
  importView,
}: {
  domId: string;
  entry: PlatformEntry;
  profile?: PlatformProfile;
  refreshing: boolean;
  refreshNote?: string;
  onRefresh?: () => void;
  onRemove: () => void;
  onImportFans?: (entry: PlatformEntry) => void;
  importView?: FansImportView;
}) {
  const label = PLATFORM_LABELS[entry.platform];
  const name = nameOf(entry);
  const handle = handleOf(entry);
  const displayName = profile?.displayName?.trim();
  const fans = Boolean(onImportFans && handle && FAN_PLATFORMS.includes(entry.platform));
  const fansNote =
    onImportFans && handle && entry.platform === 'x'
      ? 'Comments from X can’t be imported yet.'
      : null;
  const full = `${formatNumber(entry.followers)} ${pluralize(entry.followers, 'follower')}`;

  return (
    <CardShell
      domId={domId}
      labelId={`${domId}-name`}
      media={
        profile ? (
          <AvatarInitials name={displayName || handle || label} image={profile.avatarUrl} />
        ) : (
          <MarkTile platform={entry.platform} />
        )
      }
      title={displayName || label}
      meta={
        <>
          {profile ? <PlatformMark platform={entry.platform} className="size-3.5" /> : null}
          <span className="truncate">
            {handle ? `@${handle}` : entry.url.replace(/^https?:\/\/(www\.)?/, '')}
          </span>
          {displayName ? <span className="sr-only">on {label}</span> : null}
        </>
      }
      trailing={
        <>
          <p className="shrink-0 text-right" title={full}>
            <span aria-hidden="true" className="block text-body font-medium text-ink tabular-nums">
              {formatCompact(entry.followers)}
            </span>
            <span aria-hidden="true" className="block text-caption text-ink-muted uppercase">
              {pluralize(entry.followers, 'follower')}
            </span>
            <span className="sr-only">{full}</span>
          </p>
          <RemoveButton name={name} onClick={onRemove} />
        </>
      }
    >
      {profile?.source === 'simulated' || (onRefresh && entry.fetchedAt) ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:pl-13">
          {profile?.source === 'simulated' ? <SampleChip /> : null}
          {/* Only where it can be refreshed (Settings): in onboarding it is always "just now". */}
          {onRefresh && entry.fetchedAt ? (
            <span suppressHydrationWarning className="text-caption text-ink-muted uppercase">
              Fetched {formatRelative(entry.fetchedAt)}
            </span>
          ) : null}
        </div>
      ) : null}
      {onRefresh || fans || fansNote ? (
        <div className="mt-3 border-t border-line pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {onRefresh ? (
              <Button
                variant="secondary"
                size="md"
                icon={<RefreshCw />}
                loading={refreshing}
                aria-label={`Refresh ${name}`}
                onClick={onRefresh}
              >
                Refresh
              </Button>
            ) : null}
            {fans ? (
              <Button
                variant="secondary"
                size="md"
                icon={<Users />}
                loading={importView?.status === 'pending'}
                disabled={importView?.status === 'unsaved'}
                aria-label={`Import fans from comments on ${name}`}
                onClick={() => onImportFans?.(entry)}
              >
                Import fans from comments
              </Button>
            ) : null}
          </div>
          <div aria-live="polite" className="text-small text-ink-soft [&>p]:mt-2">
            {refreshNote ? <p>Couldn’t refresh. {refreshNote}.</p> : null}
            {fansNote ? <p>{fansNote}</p> : null}
            {fans ? <FansImportLine view={importView} /> : null}
          </div>
        </div>
      ) : null}
    </CardShell>
  );
}

function FansImportLine({ view }: { view?: FansImportView }) {
  if (!view || view.status === 'idle' || view.status === 'pending') return null;
  if (view.status === 'unsaved') return <p>Save your profile first, then import fans.</p>;
  if (view.status === 'error') return <p>{view.message}</p>;
  if (view.status === 'skipped') return <p>{SKIP_TEXT[view.reason]}</p>;
  const { imported, existing, posts } = view;
  const from = `${formatNumber(posts)} recent ${pluralize(posts, 'post')}`;
  const already =
    existing > 0
      ? ` (${formatNumber(existing)} ${existing === 1 ? 'was' : 'were'} already in Fans)`
      : '';
  if (imported === 0) {
    return existing > 0 ? (
      <p>No new fans from {from}: everyone who commented was already in Fans.</p>
    ) : (
      <p>{SKIP_TEXT.no_comments}</p>
    );
  }
  return (
    <p>
      Imported {formatNumber(imported)} {pluralize(imported, 'fan')} from {from}
      {already}.{' '}
      <Link
        href={routes.dashboard.followers()}
        className="inline-flex items-center gap-1 font-medium text-ink underline-offset-4 hover:underline"
      >
        Open Fans
        <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
      </Link>
    </p>
  );
}

function JobCard({
  domId,
  countId,
  job,
  onRemove,
  onRetry,
  onOpenCount,
  onCount,
  onSaveCount,
}: {
  domId: string;
  countId: string;
  job: Job;
  onRemove: () => void;
  onRetry: () => void;
  onOpenCount: () => void;
  onCount: (count: string) => void;
  onSaveCount: () => void;
}) {
  const label = PLATFORM_LABELS[job.platform];
  const name = nameOf(job);
  const failed = job.status === 'failed';
  const askCount = job.status === 'manual' || (failed && job.manualOpen);
  const why =
    job.status === 'manual'
      ? job.platform === 'other'
        ? 'We fetch Instagram, TikTok, YouTube and X. Enter the follower count for this one.'
        : `We can’t fetch ${label} profiles yet. Enter the follower count.`
      : failed
        ? `${FAILURE_TEXT[job.reason ?? 'unavailable']}.`
        : null;

  return (
    <CardShell
      domId={domId}
      labelId={`${domId}-name`}
      media={<MarkTile platform={job.platform} />}
      title={label}
      meta={
        <span className="truncate">
          {job.handle ? `@${job.handle}` : job.url.replace(/^https?:\/\/(www\.)?/, '')}
        </span>
      }
      trailing={
        <>
          {job.status === 'queued' || job.status === 'fetching' ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 text-caption text-ink-muted uppercase">
              {job.status === 'fetching' ? <Spinner className="size-3.5" /> : null}
              {job.status === 'fetching' ? 'Fetching…' : 'Waiting'}
            </span>
          ) : null}
          <RemoveButton name={name} onClick={onRemove} />
        </>
      }
    >
      {why ? (
        <p className="mt-2 flex items-start gap-1.5 text-small text-ink-soft sm:pl-13">
          {failed ? (
            <CircleAlert
              aria-hidden="true"
              strokeWidth={1.5}
              className="mt-px size-4 shrink-0 text-danger"
            />
          ) : null}
          <span className="min-w-0">{why}</span>
        </p>
      ) : null}
      {failed && !job.manualOpen ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 sm:pl-13">
          {job.reason !== 'unsupported' ? (
            <Button
              variant="secondary"
              size="md"
              icon={<RefreshCw />}
              aria-label={`Retry ${name}`}
              onClick={onRetry}
            >
              Retry
            </Button>
          ) : null}
          <button
            type="button"
            onClick={onOpenCount}
            className="inline-flex min-h-10 items-center rounded-full text-small text-ink underline underline-offset-4 hover:text-lake"
          >
            Enter the count yourself
          </button>
        </div>
      ) : null}
      {askCount ? (
        <div className="mt-3 flex flex-col sm:pl-13">
          <Label htmlFor={countId}>Followers</Label>
          <div className="flex gap-2">
            <TextField
              id={countId}
              value={job.count ?? ''}
              onChange={(e) => onCount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSaveCount();
                }
              }}
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="410K"
              aria-invalid={job.countError ? true : undefined}
              aria-describedby={`${countId}-error`}
              className="tabular-nums"
            />
            <Button
              variant="secondary"
              size="md"
              icon={<Plus />}
              aria-label={`Add ${name}`}
              onClick={onSaveCount}
              className="h-11"
            >
              Add
            </Button>
          </div>
          <FieldError id={`${countId}-error`}>{job.countError}</FieldError>
        </div>
      ) : null}
    </CardShell>
  );
}
