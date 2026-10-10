import { describe, expect, it, vi } from 'vitest';
import { UNTRUSTED_TAG } from '../../src/ai/guard.js';
import { type TriageFeedbackExample, triagePrompt } from '../../src/ai/tasks/triage-item.js';
import type { AiServices, BackgroundRunner, TriageInput } from '../../src/ai/types.js';
import { createAnalyzer } from '../../src/workers/analyze-item.js';
import { silentLogger } from '../fixtures/ai/harness.js';

const base: TriageInput = {
  kind: 'post',
  type: 'idea',
  title: 'Gym log app',
  body: 'Turns lifts into shareable stats.',
  links: [],
  communityName: 'Budget Travel',
  tasteProfile: { promote: ['fitness apps'], never: ['crypto'], voice: [] },
  creatorName: 'Mira',
};

const examples: TriageFeedbackExample[] = [
  { verdict: 'up', kind: 'post', title: 'Hostel finder', summary: 'A map of cheap hostels.' },
  { verdict: 'down', kind: 'inbound', title: 'Buy followers', summary: null },
];

describe('triage prompt with creator feedback', () => {
  it('is unchanged when there is no feedback', () => {
    const plain = triagePrompt(base);
    expect(triagePrompt({ ...base, feedback: [] })).toBe(plain);
    expect(plain).not.toContain('rated');
  });

  it('adds liked and disliked examples inside an untrusted block', () => {
    const prompt = triagePrompt({ ...base, feedback: examples });
    expect(prompt).toContain(`<${UNTRUSTED_TAG} source="creator feedback">`);
    const block = prompt.slice(prompt.indexOf('source="creator feedback"'));
    expect(block).toContain('liked | post | Hostel finder | A map of cheap hostels.');
    expect(block).toContain('disliked | pitch | Buy followers');
    // The examples come after the item, so the item's own blocks are untouched.
    expect(prompt.startsWith(triagePrompt(base))).toBe(true);
  });
});

describe('analyzer passes recent feedback to triage', () => {
  function setup(recent: TriageFeedbackExample[] | Error) {
    const subject = {
      kind: 'post' as const,
      id: '00000000-0000-4000-8000-000000000001',
      spaceId: '00000000-0000-4000-8000-000000000002',
      type: 'idea',
      title: base.title,
      body: base.body,
      links: [],
      communityName: base.communityName,
      tasteProfile: base.tasteProfile,
      creatorName: base.creatorName,
      contentHash: 'h',
      analysisStatus: 'pending',
      scoredTasteVersion: null,
      tasteVersion: 1,
      deleted: false,
      hasEmbedding: true,
    };
    const posts = {
      claimItem: vi.fn(async () => true),
      getForAnalysis: vi.fn(async () => subject),
      releaseClaim: vi.fn(async () => undefined),
      saveAnalysis: vi.fn(async () => ({ id: subject.id })),
      markFailed: vi.fn(async () => null),
    };
    const recentExamples = vi.fn(async () => {
      if (recent instanceof Error) throw recent;
      return recent;
    });
    const triageItem = vi.fn(async (_input: TriageInput) => ({
      category: 'idea' as const,
      isSpam: false,
      summary: 'A gym log app.',
      fitScore: 80,
      fitReason: 'Matches your "fitness apps" line.',
      tags: [],
      skills: [],
    }));
    const analyzer = createAnalyzer({
      repos: { posts, pitches: posts, feedback: { recentExamples } } as never,
      ai: { triageItem } as unknown as AiServices,
      background: {} as BackgroundRunner,
      logger: silentLogger,
    });
    return { analyzer, triageItem, recentExamples, subject };
  }

  it('sends the examples with the triage input, leaving out the item itself', async () => {
    const { analyzer, triageItem, recentExamples, subject } = setup(examples);
    expect(await analyzer.analyze({ kind: 'post', id: subject.id })).toBe('done');
    expect(recentExamples).toHaveBeenCalledWith(subject.spaceId, {
      excludeRefId: subject.id,
      limit: 10,
    });
    const input = triageItem.mock.calls[0]?.[0] as TriageInput;
    expect(input.feedback).toEqual(examples);
  });

  it('triages without examples when loading feedback fails', async () => {
    const { analyzer, triageItem, subject } = setup(new Error('db down'));
    expect(await analyzer.analyze({ kind: 'post', id: subject.id })).toBe('done');
    const input = triageItem.mock.calls[0]?.[0] as TriageInput;
    expect(input.feedback ?? []).toEqual([]);
  });
});
