import { describe, expect, it, vi } from 'vitest';
import {
  assertUsable,
  buildPreview,
  PreviewAbort,
  type PreviewDeps,
} from '../../src/scripts/audience-preview.js';
import {
  buildPreviewHtml,
  PREVIEW_BANNER,
  QUOTE_MAX_CHARS,
  scrubComment,
} from '../../src/scripts/audience-preview-html.js';

const FIXED = new Date('2026-10-19T12:00:00Z');
const EXPIRES = new Date('2026-10-26T12:00:00Z');

describe('scrubComment', () => {
  it('removes handles, emails, phone numbers and links', () => {
    const out = scrubComment(
      '@sam_k loved this, mail me sam@x.com or +1 415 555 0100, see https://x.co and www.sam.com/a',
    );
    for (const bad of ['@sam_k', 'sam@x.com', '555', 'https://', 'x.co', 'www.', '@']) {
      expect(out).not.toContain(bad);
    }
    expect(out).toContain('loved this');
  });

  it('strips commenter names that appear in the text', () => {
    expect(scrubComment('Thanks, Priya Shah here, great Lisbon guide', ['Priya Shah'])).toBe(
      'Thanks, here, great Lisbon guide',
    );
  });

  it('removes Unicode handles whole', () => {
    expect(scrubComment('@José this was great @Zoë_1')).toBe('this was great');
  });

  it('strips each word of a commenter name, not only the whole name', () => {
    expect(scrubComment('Sarah told me, and Lee agreed', ['Sarah Lee'])).toBe(
      'told me, and Lee agreed',
    );
  });

  it('is idempotent', () => {
    const once = scrubComment('hi @a_b call 415-555-0100 now');
    expect(scrubComment(once)).toBe(once);
  });
});

describe('buildPreviewHtml', () => {
  const longQuote = `${'a very long travel comment '.repeat(12)}`;
  const html = buildPreviewHtml({
    channelTitle: '@trips <b>&co</b>',
    videoCount: 9,
    commentCount: 212,
    rooms: [
      {
        name: 'Budget & Backpackers',
        description: 'People who plan trips under $60 a day.',
        count: 87,
        quotes: ['one @leak', 'two', 'three https://leak.example', 'four is dropped', longQuote],
      },
      { name: 'Solo firsts', description: 'First trips abroad.', count: 41, quotes: [] },
    ],
    generatedAt: FIXED,
    expiresAt: EXPIRES,
  });

  it('shows every room, count, the banner and the expiry date', () => {
    expect(html).toContain('Budget &amp; Backpackers');
    expect(html).toContain('>87 comments<');
    expect(html).toContain('Solo firsts');
    expect(html).toContain('>41 comments<');
    expect(html).toContain(PREVIEW_BANNER);
    expect(html).toContain('Oct 26, 2026');
  });

  it('keeps at most 3 quotes per room, each within the limit and scrubbed', () => {
    const quotes = [...html.matchAll(/<blockquote>(.*?)<\/blockquote>/g)].map((m) => m[1] ?? '');
    expect(quotes).toHaveLength(3);
    for (const quote of quotes) expect(quote.length).toBeLessThanOrEqual(QUOTE_MAX_CHARS);
    expect(html).not.toContain('@leak');
    expect(html).not.toContain('leak.example');
  });

  it('escapes text and has no script or external requests', () => {
    expect(html).toContain('@trips &lt;b&gt;&amp;co&lt;/b&gt;');
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/(?:src|href)=|@import|url\(/i);
  });
});

describe('assertUsable', () => {
  const commenter = { name: 'A B', handle: 'ab', note: 'hello' };
  it('aborts on sample data, zero videos and zero comments', () => {
    expect(() => assertUsable({ source: 'sample', commenters: [commenter], videos: 0 })).toThrow(
      PreviewAbort,
    );
    expect(() => assertUsable({ source: 'youtube', commenters: [commenter], videos: 0 })).toThrow(
      /no public videos/,
    );
    expect(() => assertUsable({ source: 'youtube', commenters: [], videos: 3 })).toThrow(
      /No public comments/,
    );
  });
  it('passes live data with comments', () => {
    expect(() =>
      assertUsable({ source: 'youtube', commenters: [commenter], videos: 3 }),
    ).not.toThrow();
  });
});

describe('buildPreview', () => {
  const commenters = [
    { name: 'Priya Shah', handle: 'priya_s', note: 'Lisbon on $60 a day please | love this' },
    { name: 'Sam Ortiz', handle: 'samo', note: 'Sam Ortiz here, mail sam@x.com about street food' },
    { name: 'Dana Kim', handle: 'danak', note: 'weekend route planning tips' },
  ];
  const deps = (over: Partial<PreviewDeps> = {}): PreviewDeps => ({
    commenters: async () => ({ source: 'youtube', commenters, videos: 10 }),
    cluster: async () => ({
      model: 'm',
      communities: [
        {
          name: 'Budget travel',
          description: 'Trips on a tight budget.',
          sampleQuotes: ['Lisbon on $60 a day please'],
        },
        {
          name: 'Street food',
          description: 'Food-first travellers.',
          sampleQuotes: ['Sam Ortiz here, mail sam@x.com about street food'],
        },
        { name: 'Empty', description: 'Nobody.', sampleQuotes: [] },
      ],
    }),
    tag: async ({ followers }) => ({
      model: 'm',
      tags: followers.flatMap((f) =>
        f.note.includes('$60')
          ? [{ followerId: f.id, communityIds: ['r0'] }]
          : f.note.includes('street food')
            ? [{ followerId: f.id, communityIds: ['r1'] }]
            : [],
      ),
    }),
    now: () => FIXED,
    ...over,
  });

  it('builds aggregates and scrubbed quotes without names, handles or raw extras', async () => {
    const { html, summary } = await buildPreview('@trips', deps());
    expect(summary).toBe('2 rooms from 4 comments on 10 videos');
    expect(html).toContain('Budget travel');
    expect(html).toContain('Street food');
    expect(html).not.toContain('Empty');
    for (const bad of ['Priya', 'Shah', 'priya_s', 'Sam Ortiz', 'samo', 'sam@x.com', 'Dana']) {
      expect(html).not.toContain(bad);
    }
    expect(html).toContain('here, mail about street food');
  });

  it('scrubs commenters out of room names and descriptions too', async () => {
    const { html } = await buildPreview(
      '@trips',
      deps({
        cluster: async () => ({
          model: 'm',
          communities: [
            {
              name: "@jane's crew",
              description: 'Priya wants Lisbon on $60 a day, mail priya@x.com.',
              sampleQuotes: ['Lisbon on $60 a day please'],
            },
          ],
        }),
      }),
    );
    expect(html).toContain('crew');
    for (const bad of ['@jane', 'jane', 'Priya', 'priya@x.com']) {
      expect(html).not.toContain(bad);
    }
  });

  it('aborts with a readable reason and calls no AI when the data is unusable', async () => {
    const cluster = vi.fn();
    await expect(
      buildPreview(
        '@trips',
        deps({ cluster, commenters: async () => ({ source: 'sample', commenters, videos: 0 }) }),
      ),
    ).rejects.toThrow(/sample data/);
    expect(cluster).not.toHaveBeenCalled();
  });

  it('maps YouTube failures and AI failures to aborts', async () => {
    const { YoutubeError } = await import('../../src/lib/youtube.js');
    await expect(
      buildPreview(
        '@trips',
        deps({
          commenters: async () => {
            throw new YoutubeError('quota');
          },
        }),
      ),
    ).rejects.toThrow(/quota/);
    await expect(
      buildPreview(
        '@trips',
        deps({
          cluster: async () => {
            throw new Error('boom');
          },
        }),
      ),
    ).rejects.toBeInstanceOf(PreviewAbort);
    await expect(buildPreview('not a channel', deps())).rejects.toBeInstanceOf(PreviewAbort);
  });
});
