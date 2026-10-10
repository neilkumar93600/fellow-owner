// Self-check for decision-items-core.mjs. Run from web/: node components/dashboard/today/decision-items.check.mjs
import assert from 'node:assert/strict';
import { buildDecisionItems, estimateMinutes, pulseSentence } from './decision-items-core.mjs';

const ai = (fitScore, extra = {}) => ({
  fitScore,
  fitReason: null,
  summary: null,
  category: null,
  status: 'done',
  ...extra,
});
const member = (name) => ({ membershipId: `m-${name}`, name, headline: null, image: null });

const briefing = [
  {
    index: 0,
    refType: 'post',
    refId: 'p1',
    title: 'Lisbon on $60 a day',
    why: 'Matches budget-honest travel',
    fitScore: 91,
    href: '/dashboard/ideas?item=p1',
    feedback: null,
  },
];
const pitches = [
  {
    id: 'i1',
    type: 'brand_deal',
    subject: 'Luggage',
    excerpt: 'Brand deal: luggage',
    isFiltered: false,
    sender: member('Leo'),
    ai: ai(88),
  },
  {
    id: 'i2',
    type: 'press',
    subject: 'Podcast',
    excerpt: 'Press: podcast',
    isFiltered: false,
    sender: member('Kim'),
    ai: ai(95),
  },
  {
    id: 'i3',
    type: 'other',
    subject: 'Buy followers',
    excerpt: 'buy 10K followers',
    isFiltered: true,
    sender: member('Spam'),
    ai: ai(99),
  },
];
const community = (name) => ({ id: name, slug: name, name, tint: 'peach', icon: 'globe' });
const posts = [
  {
    id: 'p1',
    title: 'Lisbon on $60 a day',
    excerpt: 'A fan-made guide',
    author: member('Ana'),
    useCount: 30,
    buildCount: 10,
    community: community('Budget Travel'),
    hidden: false,
    ai: ai(91),
  },
  {
    id: 'p2',
    title: 'Tokyo cafés map',
    excerpt: 'Every café under $5',
    author: member('Jo'),
    useCount: 10,
    buildCount: 2,
    community: community('Food Finds'),
    hidden: false,
    ai: ai(70),
  },
  {
    id: 'p3',
    title: 'Hidden one',
    excerpt: '',
    author: member('Zed'),
    useCount: 99,
    buildCount: 99,
    community: community('Food Finds'),
    hidden: true,
    ai: ai(70),
  },
];

const items = buildDecisionItems({ briefing, pitches, posts });
assert.equal(items[0].refId, 'p1'); // briefing first
assert.deepEqual(
  items.map((i) => i.refId),
  ['p1', 'i2', 'i1', 'p2'],
); // pitches by score, post dedupe, filtered + hidden left out
assert.equal(items[0].name, 'Ana'); // a briefing pick takes its face and room from the matching row
assert.equal(items[0].context, 'Budget Travel');
assert.equal(items[0].reason, 'Matches budget-honest travel');
assert.equal(items[0].kind, 'post');
assert.equal(items[1].kind, 'pitch');
assert.equal(items[1].context, 'Press');
assert.equal(items[2].context, 'Brand deal');
assert.equal(new Set(items.map((i) => i.id)).size, items.length); // keys are unique
const orphan = {
  index: 1,
  refType: 'post',
  refId: 'p9',
  title: 'Seoul menu translator',
  why: 'x',
  fitScore: 80,
  href: '/dashboard/ideas?item=p9',
  feedback: null,
};
const [o] = buildDecisionItems({ briefing: [orphan], pitches: [], posts: [] });
assert.equal(o.name, 'A fan'); // never the idea's title as a person's name
assert.equal(o.title, 'Seoul menu translator');
assert.equal(buildDecisionItems({ briefing, pitches, posts, limit: 2 }).length, 2);
assert.equal(buildDecisionItems({ briefing: [], pitches: [], posts: [] }).length, 0);
assert.equal(estimateMinutes(5), 6);
assert.equal(estimateMinutes(0), 1);

const room = (name, posts) => ({ name, posts });
assert.equal(
  pulseSentence([room('Food Finds', 12), room('Budget Travel', 41)]),
  'Budget Travel was your busiest community this week: 41 new ideas.',
);
assert.equal(
  pulseSentence([room('Slow Living', 1)]),
  'Slow Living was your busiest community this week: 1 new idea.',
);
assert.equal(pulseSentence([room('Slow Living', 0)]), null);
assert.equal(pulseSentence([]), null);

console.log('decision-items ok');
