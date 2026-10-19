import { generateText } from 'ai';
import { describe, expect, it } from 'vitest';
import { createAiModels } from '../../src/ai/provider.js';
import { TEST_AI_ENV } from '../fixtures/ai/harness.js';

// Fake keys only; fetch is injected, so nothing here touches the network.
const FAKE_ANTHROPIC_KEY = 'sk-ant-fake-test-key';

function recordingFetch() {
  const requests: { url: string; headers: Headers; body: Record<string, unknown> }[] = [];
  const fetchStub: typeof fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    requests.push({
      url,
      headers: new Headers(init?.headers),
      body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>,
    });
    return new Response(
      JSON.stringify({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        model: 'claude-haiku-5-5',
        content: [{ type: 'text', text: 'hello' }],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 12, output_tokens: 3 },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
  return { requests, fetch: fetchStub };
}

describe('createAiModels', () => {
  it('without ANTHROPIC_API_KEY keeps both chat tiers on OpenRouter', () => {
    const models = createAiModels(TEST_AI_ENV);
    expect(models.fast).toMatchObject({ id: TEST_AI_ENV.AI_MODEL_FAST, provider: 'openrouter' });
    expect(models.smart).toMatchObject({ id: TEST_AI_ENV.AI_MODEL_SMART, provider: 'openrouter' });
    expect(models.embedding).toMatchObject({
      id: TEST_AI_ENV.AI_EMBEDDING_MODEL,
      provider: 'openrouter',
    });
  });

  it('with ANTHROPIC_API_KEY sends fast and smart to Anthropic, embeddings stay on OpenRouter', () => {
    const models = createAiModels({ ...TEST_AI_ENV, ANTHROPIC_API_KEY: FAKE_ANTHROPIC_KEY });
    expect(models.fast).toMatchObject({ id: 'claude-haiku-5-5', provider: 'anthropic' });
    expect(models.smart).toMatchObject({ id: 'claude-sonnet-5-5', provider: 'anthropic' });
    expect(models.embedding).toMatchObject({
      id: TEST_AI_ENV.AI_EMBEDDING_MODEL,
      provider: 'openrouter',
    });
  });

  it('honours ANTHROPIC_MODEL_FAST and ANTHROPIC_MODEL_SMART', () => {
    const models = createAiModels({
      ...TEST_AI_ENV,
      ANTHROPIC_API_KEY: FAKE_ANTHROPIC_KEY,
      ANTHROPIC_MODEL_FAST: 'claude-test-fast',
      ANTHROPIC_MODEL_SMART: 'claude-test-smart',
    });
    expect(models.fast.id).toBe('claude-test-fast');
    expect(models.smart.id).toBe('claude-test-smart');
  });

  it('still needs OPENROUTER_API_KEY for embeddings', () => {
    expect(() =>
      createAiModels({
        ...TEST_AI_ENV,
        OPENROUTER_API_KEY: undefined,
        ANTHROPIC_API_KEY: FAKE_ANTHROPIC_KEY,
      }),
    ).toThrow(/OPENROUTER_API_KEY/);
  });

  it('calls api.anthropic.com without any OpenRouter-only settings', async () => {
    const { requests, fetch: fetchStub } = recordingFetch();
    const models = createAiModels(
      { ...TEST_AI_ENV, ANTHROPIC_API_KEY: FAKE_ANTHROPIC_KEY },
      { fetch: fetchStub },
    );

    const result = await generateText({ model: models.fast.model, prompt: 'hi', maxRetries: 0 });

    expect(result.text).toBe('hello');
    expect(result.totalUsage.inputTokens).toBe(12);
    expect(result.totalUsage.outputTokens).toBe(3);
    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(new URL(request?.url ?? '').host).toBe('api.anthropic.com');
    expect(request?.headers.get('x-api-key')).toBe(FAKE_ANTHROPIC_KEY);
    expect(request?.body.model).toBe('claude-haiku-5-5');
    for (const openRouterOnly of ['plugins', 'usage', 'reasoning', 'provider']) {
      expect(request?.body).not.toHaveProperty(openRouterOnly);
    }
  });
});
