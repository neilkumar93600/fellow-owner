'use client';

import { type ReadonlyURLSearchParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

// Tabs, sorts, filters, ?item= and ?page= live in the URL (03-app-flow §6), so every view is linkable
// and Back works. Pages that read these must sit under a <Suspense> boundary when they prerender.

export type UrlPatch = Record<string, string | number | null | undefined>;
export interface UrlWriteOptions {
  /** Add a history entry (Back returns here). Default: replace the current one. */
  push?: boolean;
}

/**
 * The last write that has not reached the address bar yet. Two writes in a row (a filter, then a page
 * reset, or a debounced search racing a click) build on each other instead of dropping keys.
 */
let pending: { path: string; from: string; to: string } | null = null;

export function useUrlState(): {
  params: ReadonlyURLSearchParams;
  get: (key: string) => string | null;
  set: (patch: UrlPatch, opts?: UrlWriteOptions) => void;
} {
  const router = useRouter();
  const params = useSearchParams();

  const get = useCallback((key: string) => params.get(key), [params]);

  /** Merges `patch` into the query: null, undefined and '' delete a key. Never scrolls. */
  const set = useCallback(
    (patch: UrlPatch, opts: UrlWriteOptions = {}) => {
      // Read the live URL, not a render's snapshot, so a stale callback cannot undo newer changes.
      const { pathname, search } = window.location;
      const current = new URLSearchParams(search).toString();
      const base = pending?.path === pathname && pending.from === current ? pending.to : current;
      const next = new URLSearchParams(base);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === '') next.delete(key);
        else next.set(key, String(value));
      }
      const to = next.toString();
      if (to === base) return;
      pending = { path: pathname, from: current, to };
      const href = to ? `${pathname}?${to}` : pathname;
      if (opts.push) router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
    },
    [router],
  );

  return { params, get, set };
}

/** One of `values` from ?key=, else `fallback`. Setting the fallback removes the key. */
export function useUrlEnum<T extends string>(
  key: string,
  values: readonly T[],
  fallback: T,
): [T, (value: T, opts?: UrlWriteOptions) => void] {
  const { get, set } = useUrlState();
  const raw = get(key);
  const value = values.find((v) => v === raw) ?? fallback;
  const setValue = useCallback(
    (next: T, opts?: UrlWriteOptions) => set({ [key]: next === fallback ? null : next }, opts),
    [set, key, fallback],
  );
  return [value, setValue];
}

/** ?key= as a string ('' when absent). Setting null or blank removes the key. */
export function useUrlString(
  key: string,
): [string, (value: string | null, opts?: UrlWriteOptions) => void] {
  const { get, set } = useUrlState();
  const setValue = useCallback(
    (next: string | null, opts?: UrlWriteOptions) =>
      set({ [key]: next?.trim() ? next : null }, opts),
    [set, key],
  );
  return [get(key) ?? '', setValue];
}
