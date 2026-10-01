import { waitUntil } from '@vercel/functions';
import type { BackgroundRunner } from '../ai/types.js';
import type { Logger } from '../lib/logger.js';

/** Where @vercel/functions finds the per-request context (it exposes `waitUntil`). */
const VERCEL_REQUEST_CONTEXT = Symbol.for('@vercel/request-context');

type ContextHolder = { get?: () => { waitUntil?: unknown } | undefined } | undefined;

/** True inside a Vercel function invocation, where waitUntil keeps the function alive. */
export function hasWaitUntilContext(): boolean {
  const holder = (globalThis as unknown as Record<symbol, ContextHolder>)[VERCEL_REQUEST_CONTEXT];
  return typeof holder?.get?.()?.waitUntil === 'function';
}

export interface BackgroundRunnerOptions {
  /** Override detection of the Vercel request context (tests). */
  hasContext?: () => boolean;
  /** Override waitUntil (tests). */
  waitUntil?: (promise: Promise<unknown>) => void;
}

/**
 * runInBackground(): work that continues after the response (02-trd D6).
 * - On Vercel, `waitUntil` keeps the function alive until the promise settles (up to the
 *   function's max duration).
 * - Locally (`pnpm dev`, Docker, tests) there is no request context: the promise runs
 *   fire-and-forget in the long-lived process; local.ts waits for it on shutdown.
 * Errors never escape: they are logged with the task label. `whenIdle()` resolves once every
 * task started so far has settled (tests await it instead of sleeping).
 */
export function createBackgroundRunner(
  logger: Logger,
  options: BackgroundRunnerOptions = {},
): BackgroundRunner & { readonly pending: number } {
  const log = logger.child({ module: 'background' });
  const inflight = new Set<Promise<void>>();
  const hasContext = options.hasContext ?? hasWaitUntilContext;
  const keepAlive = options.waitUntil ?? waitUntil;
  const onVercel = process.env.VERCEL === '1';
  let warnedNoContext = false;

  return {
    get pending() {
      return inflight.size;
    },

    run(label, task) {
      const promise = (async () => {
        const started = Date.now();
        try {
          await task();
          log.debug({ label, ms: Date.now() - started }, 'background task done');
        } catch (error) {
          log.error({ err: error, label, ms: Date.now() - started }, 'background task failed');
        }
      })();
      inflight.add(promise);
      void promise.finally(() => inflight.delete(promise));

      if (hasContext()) {
        try {
          keepAlive(promise);
        } catch (error) {
          log.warn({ err: error, label }, 'waitUntil failed; running fire-and-forget');
        }
      } else if (onVercel && !warnedNoContext) {
        warnedNoContext = true;
        log.warn({ label }, 'no Vercel request context; background work may be cut short');
      }
    },

    async whenIdle() {
      while (inflight.size > 0) await Promise.allSettled([...inflight]);
    },
  };
}

/** Services call this with the container's runner, e.g. `runInBackground(bg, 'analyze', fn)`. */
export function runInBackground(
  runner: BackgroundRunner,
  label: string,
  task: () => Promise<void>,
): void {
  runner.run(label, task);
}
