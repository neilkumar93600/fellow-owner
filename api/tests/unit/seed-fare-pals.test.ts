import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = <T>(name: string): T =>
  JSON.parse(readFileSync(new URL(`../../src/db/seed/data/${name}.json`, import.meta.url), 'utf8'));

interface Post {
  title: string;
  community: string;
  type: string;
  status: string;
  body: string;
  links: Array<{ url: string }>;
  team: Array<{ role: string; status: string }>;
  ai: { fitScore: number; fitReason: string };
}
interface Promotion {
  postIndex: number;
  drafts: Record<string, { text: string }>;
  showcaseSlug: string;
  publishedDaysAgo: number;
  clicks: Array<{ count: number }>;
}

const TITLE = 'Fare Pals: fare alerts for $60-a-day trips';
const posts = read<Post[]>('posts');
const promotions = read<Promotion[]>('promotions');

// The posts that existed before Fare Pals. They keep their indices, so the new one is last.
const PRE_EXISTING = 140;
const FIRST_TITLES = [
  'A menu translator for Seoul, with real prices',
  'Lisbon on $60 a day',
  'Ten family kitchens in Oaxaca',
];

describe('Fare Pals seed story', () => {
  const index = posts.findIndex((p) => p.title === TITLE);
  const post = posts[index] as Post;

  it('is one launched Budget Travel project, appended last', () => {
    expect(posts.filter((p) => p.title === TITLE)).toHaveLength(1);
    expect(index).toBe(PRE_EXISTING);
    expect(index).toBe(posts.length - 1);
    expect(post).toMatchObject({ community: 'budget-travel', type: 'project', status: 'launched' });
  });

  it('has a crew of five accepted fans in the five roles', () => {
    expect(post.team.filter((t) => t.status === 'accepted').map((t) => t.role)).toEqual([
      'Developer',
      'Designer',
      'Fare analyst',
      'Local guide',
      'Community host',
    ]);
  });

  it('cites the taste profile, a sign-up count and a sign-up page', () => {
    expect(post.ai.fitScore).toBeGreaterThanOrEqual(90);
    expect(post.ai.fitReason).toContain('budget-honest travel');
    expect(post.body).toMatch(/\d+ people have signed up/);
    expect(post.links.some((l) => l.url.startsWith('https://example.com/'))).toBe(true);
  });

  it('keeps the earlier posts where they were', () => {
    expect(posts.length).toBe(PRE_EXISTING + 1);
    expect(posts[31]?.title).toBe(FIRST_TITLES[1]);
    expect(posts[40]?.title).toBe(FIRST_TITLES[2]);
    expect(posts[6]?.title).toBe(FIRST_TITLES[0]);
  });

  it('was spotlighted 2 days ago with drafts and clicks', () => {
    const promo = promotions.find((p) => p.postIndex === index);
    expect(promo).toBeDefined();
    expect(promo?.publishedDaysAgo).toBe(2);
    expect(Object.keys(promo?.drafts ?? {}).sort()).toEqual(['instagram', 'x', 'youtube']);
    expect(promo?.showcaseSlug).toBe('fare-pals');
    expect(promo?.clicks.reduce((n, c) => n + c.count, 0)).toBeGreaterThan(0);
  });

  it('keeps the spotlight rate near one a week', () => {
    const recent = promotions.filter((p) => p.publishedDaysAgo < 30);
    expect(recent).toHaveLength(4);
    expect(recent.some((p) => p.publishedDaysAgo < 7)).toBe(true);
    expect(new Set(promotions.map((p) => p.showcaseSlug)).size).toBe(promotions.length);
  });
});
