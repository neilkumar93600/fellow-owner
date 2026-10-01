import type { Logger } from '../lib/logger.js';
import { type AiAccounting, describeAiError, preflight, recordRun } from './run.js';
import { type AiContext, type AiTaskName, AiUnavailableError } from './types.js';

/**
 * Image and video generation through fal.ai (FAL_KEY). Text tasks use OpenRouter; anything that
 * produces media goes through here.
 *
 * - No v1 route generates media. The seed script (db/seed/generate-content.ts) can use the bare
 *   client to create the demo creator photo.
 * - A future feature that generates media for a space uses `createMediaServices`, which adds the
 *   same checks as ai/run.ts: enabled, the space's daily budget, a per-space daily cap
 *   (TASK_CAPS.generateImage / generateVideo) and one ai_runs row per call (tokens 0).
 *
 * fal queue API: POST https://queue.fal.run/{model} -> { request_id, status_url, response_url };
 * poll status_url until COMPLETED, then GET response_url for the output.
 */

export const FAL_QUEUE_URL = 'https://queue.fal.run';

/** Default models; any fal model id can be passed per call. */
export const FAL_MODELS = {
  /** Fast, cheap stills. */
  image: 'fal-ai/flux/schnell',
  /** Higher quality stills (seed assets). */
  imageQuality: 'fal-ai/flux/dev',
  /** Text to video, 5 or 10 seconds. */
  video: 'fal-ai/kling-video/v2.1/standard/text-to-video',
} as const;

export type FalImageSize =
  | 'square_hd'
  | 'square'
  | 'portrait_4_3'
  | 'portrait_16_9'
  | 'landscape_4_3'
  | 'landscape_16_9'
  | { width: number; height: number };

export interface GenerateImageInput {
  prompt: string;
  model?: string;
  imageSize?: FalImageSize;
  /** 1..4 */
  numImages?: number;
  seed?: number;
  /** Extra model-specific input merged into the request. */
  extra?: Record<string, unknown>;
}

export interface GeneratedImage {
  url: string;
  width: number | null;
  height: number | null;
  contentType: string | null;
}

export interface GenerateImageOutput {
  images: GeneratedImage[];
  seed: number | null;
  model: string;
  requestId: string;
}

export interface GenerateVideoInput {
  prompt: string;
  model?: string;
  /** Seconds; most models accept 5 or 10. */
  durationSeconds?: 5 | 10;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  /** Image-to-video models take a start frame. */
  imageUrl?: string;
  negativePrompt?: string;
  extra?: Record<string, unknown>;
}

export interface GenerateVideoOutput {
  url: string;
  contentType: string | null;
  model: string;
  requestId: string;
}

export class FalError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'FalError';
  }
}

export interface FalClientOptions {
  key: string;
  fetch?: typeof fetch;
  queueUrl?: string;
  /** Delay between status polls (default 1 s for images, 4 s for video). */
  pollIntervalMs?: number;
  logger?: Logger;
}

interface QueueSubmit {
  request_id: string;
  status_url?: string;
  response_url?: string;
}

const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;
const MAX_PROMPT_CHARS = 2_000;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new Error('aborted'));
      },
      { once: true },
    );
  });
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function errorDetail(body: unknown): string {
  if (body && typeof body === 'object') {
    const detail =
      (body as { detail?: unknown; message?: unknown }).detail ??
      (body as { message?: unknown }).message;
    if (typeof detail === 'string') return detail;
    if (detail !== undefined) return JSON.stringify(detail).slice(0, 300);
  }
  return 'request failed';
}

/** A minimal fal.ai queue client (no SDK dependency). */
export function createFalClient(options: FalClientOptions) {
  if (!options.key) throw new Error('FAL_KEY is required for fal.ai media generation');
  const fetchImpl = options.fetch ?? fetch;
  const queueUrl = (options.queueUrl ?? FAL_QUEUE_URL).replace(/\/+$/, '');
  const headers = {
    Authorization: `Key ${options.key}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  async function call(
    url: string,
    init: RequestInit,
    signal: AbortSignal,
  ): Promise<{ status: number; body: unknown }> {
    const response = await fetchImpl(url, { ...init, headers, signal });
    const text = await response.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { detail: text.slice(0, 300) };
    }
    if (!response.ok && response.status !== 202) {
      throw new FalError(`fal.ai ${response.status}: ${errorDetail(body)}`, response.status);
    }
    return { status: response.status, body };
  }

  /** Submits a job, waits for it, returns its output. */
  async function run(
    model: string,
    input: Record<string, unknown>,
    { timeoutMs, pollIntervalMs }: { timeoutMs: number; pollIntervalMs: number },
  ): Promise<{ requestId: string; output: Record<string, unknown> }> {
    if (!/^[\w.-]+(\/[\w.-]+)+$/.test(model)) throw new FalError(`invalid fal model id: ${model}`);
    const signal = AbortSignal.timeout(timeoutMs);
    const submitted = (
      await call(`${queueUrl}/${model}`, { method: 'POST', body: JSON.stringify(input) }, signal)
    ).body as QueueSubmit;
    if (!submitted?.request_id) throw new FalError('fal.ai did not return a request id');
    const requestId = submitted.request_id;
    const appId = model.split('/').slice(0, 2).join('/');
    const statusUrl = submitted.status_url ?? `${queueUrl}/${appId}/requests/${requestId}/status`;
    const responseUrl = submitted.response_url ?? `${queueUrl}/${appId}/requests/${requestId}`;
    options.logger?.debug({ model, requestId }, 'fal job submitted');

    for (;;) {
      const { body } = await call(statusUrl, { method: 'GET' }, signal);
      const status = (body as { status?: string } | null)?.status;
      if (status === 'COMPLETED') break;
      if (status && status !== 'IN_QUEUE' && status !== 'IN_PROGRESS') {
        throw new FalError(`fal.ai job ${requestId} ended with status ${status}`);
      }
      await sleep(pollIntervalMs, signal);
    }
    const { body } = await call(responseUrl, { method: 'GET' }, signal);
    if (!body || typeof body !== 'object') throw new FalError('fal.ai returned an empty result');
    return { requestId, output: body as Record<string, unknown> };
  }

  return {
    async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
      const model = input.model ?? FAL_MODELS.image;
      const { requestId, output } = await run(
        model,
        {
          prompt: input.prompt.slice(0, MAX_PROMPT_CHARS),
          image_size: input.imageSize ?? 'square_hd',
          num_images: Math.min(4, Math.max(1, input.numImages ?? 1)),
          enable_safety_checker: true,
          ...(input.seed !== undefined ? { seed: input.seed } : {}),
          ...input.extra,
        },
        { timeoutMs: 120_000, pollIntervalMs: options.pollIntervalMs ?? 1_000 },
      );
      const images = (Array.isArray(output.images) ? output.images : [])
        .map((image: Record<string, unknown>) => ({
          url: asString(image?.url) ?? '',
          width: asNumber(image?.width),
          height: asNumber(image?.height),
          contentType: asString(image?.content_type),
        }))
        .filter((image) => image.url.startsWith('https://'));
      if (images.length === 0) throw new FalError(`fal.ai job ${requestId} returned no images`);
      return { images, seed: asNumber(output.seed), model, requestId };
    },

    async generateVideo(input: GenerateVideoInput): Promise<GenerateVideoOutput> {
      const model = input.model ?? FAL_MODELS.video;
      const { requestId, output } = await run(
        model,
        {
          prompt: input.prompt.slice(0, MAX_PROMPT_CHARS),
          duration: String(input.durationSeconds ?? 5),
          aspect_ratio: input.aspectRatio ?? '16:9',
          ...(input.imageUrl ? { image_url: input.imageUrl } : {}),
          ...(input.negativePrompt ? { negative_prompt: input.negativePrompt } : {}),
          ...input.extra,
        },
        { timeoutMs: 600_000, pollIntervalMs: options.pollIntervalMs ?? 4_000 },
      );
      const video = output.video as Record<string, unknown> | undefined;
      const url = asString(video?.url);
      if (!url?.startsWith('https://'))
        throw new FalError(`fal.ai job ${requestId} returned no video`);
      return { url, contentType: asString(video?.content_type), model, requestId };
    },

    /** Downloads a generated file (https only, size capped) e.g. to commit a seed asset. */
    async download(url: string): Promise<{ bytes: Uint8Array; contentType: string | null }> {
      if (!url.startsWith('https://')) throw new FalError('refusing to download a non-https URL');
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(120_000) });
      if (!response.ok)
        throw new FalError(`download failed with ${response.status}`, response.status);
      const length = Number(response.headers.get('content-length') ?? 0);
      if (length > MAX_DOWNLOAD_BYTES) throw new FalError('file is too large');
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > MAX_DOWNLOAD_BYTES) throw new FalError('file is too large');
      return { bytes, contentType: response.headers.get('content-type') };
    },
  };
}

export type FalClient = ReturnType<typeof createFalClient>;

// ---------------------------------------------------------------- accounted media services

export interface MediaServicesDeps {
  fal: FalClient | null;
  accounting: AiAccounting;
  logger: Logger;
  now?: () => Date;
}

/**
 * Media generation for a space, with the ai/run.ts checks: AiUnavailableError('disabled') when
 * no FAL_KEY, 'budget' when the space's AI budget is used up, 'cap' past the daily cap,
 * 'provider' when fal.ai fails. One ai_runs row per call (model = fal model id, tokens 0).
 */
export function createMediaServices(deps: MediaServicesDeps) {
  const rt = {
    enabled: deps.fal !== null,
    accounting: deps.accounting,
    logger: deps.logger,
    ...(deps.now ? { now: deps.now } : {}),
  };

  async function accounted<T extends { model: string }>(
    task: AiTaskName,
    ctx: AiContext,
    model: string,
    produce: (fal: FalClient) => Promise<T>,
  ): Promise<T> {
    await preflight(rt, task, ctx);
    if (!deps.fal) throw new AiUnavailableError('disabled', 'fal.ai is not configured', { task });
    const started = Date.now();
    try {
      const output = await produce(deps.fal);
      await recordRun(rt, {
        task,
        ctx,
        model: output.model,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - started,
        status: 'ok',
      });
      return output;
    } catch (error) {
      const message = error instanceof FalError ? error.message : describeAiError(error);
      await recordRun(rt, {
        task,
        ctx,
        model,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - started,
        status: 'error',
        error: message,
      });
      throw new AiUnavailableError('provider', `AI ${task} failed: ${message}`, {
        task,
        cause: error,
      });
    }
  }

  return {
    enabled: deps.fal !== null,
    generateImage: (input: GenerateImageInput, ctx: AiContext) =>
      accounted('generateImage', ctx, input.model ?? FAL_MODELS.image, (fal) =>
        fal.generateImage(input),
      ),
    generateVideo: (input: GenerateVideoInput, ctx: AiContext) =>
      accounted('generateVideo', ctx, input.model ?? FAL_MODELS.video, (fal) =>
        fal.generateVideo(input),
      ),
  };
}

export type MediaServices = ReturnType<typeof createMediaServices>;
