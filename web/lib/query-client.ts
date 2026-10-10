import { isServer, QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/fetcher';

/**
 * Retry a failed query once, except when the API answered with a 4xx: asking again cannot change that
 * answer. Network errors (status 0) and 5xx get their one retry.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: shouldRetry, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

let browserClient: QueryClient | undefined;

/**
 * A fresh client for every server render, one client for the whole browser session. A module singleton
 * rather than useState, so a render that suspends before the providers commit cannot drop the cache.
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  browserClient ??= makeQueryClient();
  return browserClient;
}
