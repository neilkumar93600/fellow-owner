import { describe, expect, it } from 'vitest';
import { createFalClient, createMediaServices, FAL_MODELS } from '../../src/ai/media.js';
import { AiUnavailableError } from '../../src/ai/types.js';
import { createMemoryAccounting, SPACE_ID, silentLogger } from '../fixtures/ai/harness.js';

// fal.ai queue flow with a mocked fetch: submit -> status polls -> result; plus the accounted
// media services (enabled, cap, ai_runs row). No network.

interface Call {
  method: string;
  url: string;
  auth: string | null;
  body: Record<string, unknown> | null;
}

function falMock(
  result: Record<string, unknown>,
  options: { pending?: number; failSubmit?: number } = {},
) {
  const calls: Call[] = [];
  let polls = 0;
  const appBase = 'https://queue.fal.run/fal-ai/flux';
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    calls.push({
      method: init?.method ?? 'GET',
      url,
      auth: headers.get('authorization'),
      body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null,
    });
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      });
    if (init?.method === 'POST') {
      if (options.failSubmit) return json({ detail: 'Invalid key' }, options.failSubmit);
      return json({
        request_id: 'req-1',
        status_url: `${appBase}/requests/req-1/status`,
        response_url: `${appBase}/requests/req-1`,
      });
    }
    if (url.endsWith('/status')) {
      polls += 1;
      return polls <= (options.pending ?? 1)
        ? json({ status: polls === 1 ? 'IN_QUEUE' : 'IN_PROGRESS' }, 202)
        : json({ status: 'COMPLETED' });
    }
    if (url.startsWith('https://v3.fal.media/')) {
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      });
    }
    return json(result);
  }) as typeof fetch;
  return { fetch: fetchImpl, calls };
}

const imageResult = {
  images: [
    {
      url: 'https://v3.fal.media/files/mira.jpg',
      width: 1024,
      height: 1024,
      content_type: 'image/jpeg',
    },
  ],
  seed: 42,
};

describe('fal.ai client', () => {
  it('submits, polls until completed and returns images', async () => {
    const mock = falMock(imageResult, { pending: 2 });
    const fal = createFalClient({ key: 'fal-test-key', fetch: mock.fetch, pollIntervalMs: 1 });
    const result = await fal.generateImage({
      prompt: 'Portrait of a fitness creator',
      imageSize: 'portrait_4_3',
      seed: 42,
    });
    expect(result).toEqual({
      images: [
        {
          url: 'https://v3.fal.media/files/mira.jpg',
          width: 1024,
          height: 1024,
          contentType: 'image/jpeg',
        },
      ],
      seed: 42,
      model: FAL_MODELS.image,
      requestId: 'req-1',
    });
    expect(mock.calls[0]).toMatchObject({
      method: 'POST',
      url: `https://queue.fal.run/${FAL_MODELS.image}`,
      auth: 'Key fal-test-key',
      body: {
        prompt: 'Portrait of a fitness creator',
        image_size: 'portrait_4_3',
        num_images: 1,
        seed: 42,
        enable_safety_checker: true,
      },
    });
    expect(mock.calls.filter((c) => c.url.endsWith('/status'))).toHaveLength(3);
    expect(mock.calls.at(-1)?.url).toBe('https://queue.fal.run/fal-ai/flux/requests/req-1');
  });

  it('downloads https files only', async () => {
    const fal = createFalClient({ key: 'k', fetch: falMock(imageResult).fetch });
    const file = await fal.download('https://v3.fal.media/files/mira.jpg');
    expect([...file.bytes]).toEqual([1, 2, 3]);
    expect(file.contentType).toBe('image/jpeg');
    await expect(fal.download('http://example.com/x.jpg')).rejects.toThrow(/non-https/);
  });

  it('returns a video url', async () => {
    const mock = falMock(
      { video: { url: 'https://v3.fal.media/files/clip.mp4', content_type: 'video/mp4' } },
      { pending: 0 },
    );
    const fal = createFalClient({ key: 'k', fetch: mock.fetch, pollIntervalMs: 1 });
    const video = await fal.generateVideo({
      prompt: 'A run club at sunrise',
      durationSeconds: 5,
      aspectRatio: '9:16',
    });
    expect(video).toMatchObject({
      url: 'https://v3.fal.media/files/clip.mp4',
      contentType: 'video/mp4',
      model: FAL_MODELS.video,
    });
    expect(mock.calls[0]?.body).toMatchObject({ duration: '5', aspect_ratio: '9:16' });
  });

  it('surfaces fal errors', async () => {
    const fal = createFalClient({
      key: 'k',
      fetch: falMock(imageResult, { failSubmit: 401 }).fetch,
    });
    await expect(fal.generateImage({ prompt: 'x' })).rejects.toThrow('fal.ai 401: Invalid key');
  });

  it('requires a key', () => {
    expect(() => createFalClient({ key: '' })).toThrow(/FAL_KEY/);
  });
});

describe('accounted media services', () => {
  const ctx = { spaceId: SPACE_ID, userId: null };

  it('is disabled without a fal client', async () => {
    const { accounting, rows } = createMemoryAccounting();
    const media = createMediaServices({ fal: null, accounting, logger: silentLogger });
    const error = await media.generateImage({ prompt: 'x' }, ctx).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiUnavailableError);
    expect((error as AiUnavailableError).reason).toBe('disabled');
    expect(rows).toHaveLength(0);
  });

  it('writes one ai_runs row per call and applies the daily cap', async () => {
    const { accounting, rows } = createMemoryAccounting();
    const fal = createFalClient({
      key: 'k',
      fetch: falMock(imageResult, { pending: 0 }).fetch,
      pollIntervalMs: 1,
    });
    const media = createMediaServices({ fal, accounting, logger: silentLogger });
    await media.generateImage({ prompt: 'x' }, ctx);
    expect(rows[0]).toMatchObject({
      task: 'generateImage',
      model: FAL_MODELS.image,
      status: 'ok',
      inputTokens: 0,
    });
    for (let i = 1; i < 20; i += 1) {
      const again = createFalClient({
        key: 'k',
        fetch: falMock(imageResult, { pending: 0 }).fetch,
        pollIntervalMs: 1,
      });
      await createMediaServices({ fal: again, accounting, logger: silentLogger }).generateImage(
        { prompt: 'x' },
        ctx,
      );
    }
    const capped = await media.generateImage({ prompt: 'x' }, ctx).catch((e: unknown) => e);
    expect((capped as AiUnavailableError).reason).toBe('cap');
    expect(rows).toHaveLength(20);
  });

  it('records provider failures', async () => {
    const { accounting, rows } = createMemoryAccounting();
    const fal = createFalClient({
      key: 'k',
      fetch: falMock(imageResult, { failSubmit: 500 }).fetch,
    });
    const media = createMediaServices({ fal, accounting, logger: silentLogger });
    const error = await media.generateImage({ prompt: 'x' }, ctx).catch((e: unknown) => e);
    expect((error as AiUnavailableError).reason).toBe('provider');
    expect(rows[0]).toMatchObject({ status: 'error', error: 'fal.ai 500: Invalid key' });
  });
});
