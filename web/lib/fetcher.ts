import type { ApiErrorBody } from '@fellow-owners/shared';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Fetch wrapper: JSON in and out, errors mapped to ApiError. The browser passes same-origin /api paths;
 * lib/server-api.ts passes absolute API URLs. An aborted request rethrows its AbortError untouched.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: 'include',
      ...rest,
      headers: {
        Accept: 'application/json',
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch (error) {
    // A cancelled query or unmounted form is not a network failure.
    if (rest.signal?.aborted) throw error;
    throw new ApiError(0, 'network_error', 'Network error. Check your connection and try again.');
  }

  const text = await response.text();
  const data = text ? safeJson(text) : null;
  if (!response.ok) {
    const body = data as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'internal_error',
      body?.error?.message ?? 'Something went wrong.',
      body?.error?.details,
    );
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
