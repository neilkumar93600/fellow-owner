// Static copy and layout for the hero's product stage (spec §4b). Every number comes from DEMO, so the
// hero never disagrees with the sections below it.

import { DEMO, totalMembers } from './demo-data';
import { LIVE_CREW, LIVE_DECISION, LIVE_ROOMS, LIVE_SPACE, LIVE_URLS } from './loop-live-data';

export { LIVE_CREW, LIVE_DECISION, LIVE_SPACE };

/** The phone shows three rooms of the /mira bio page. */
export const HERO_ROOMS = LIVE_ROOMS.slice(0, 3);

export const HERO_URL = LIVE_URLS[4];

/** Honest labels: the pilot figure is a target, not a result. `strong` is the emphasised part. */
export const HERO_STATS = [
  { before: 'about ', strong: '10 min', after: ' a day' },
  { before: '', strong: '7 in 10', after: ' AI picks kept (pilot target)' },
  { before: '', strong: '1 link', after: ' in your bio' },
] as const;

export const HERO_CARD = {
  kicker: `In ${DEMO.creator.firstName}’s demo space`,
  line: `${totalMembers} fans · ${DEMO.rooms.length} rooms`,
  sub: 'new ideas this week',
} as const;

export const MIRA_CHIP = `Demo creator: @${DEMO.creator.handle} · ${DEMO.creator.niche} · ${DEMO.followers.label}`;

export const CREDIT_CHIP = { title: DEMO.idea.title, by: LIVE_DECISION.name } as const;

/**
 * The stage is laid out in one 720x640 box (the SVG viewBox), so the leader lines, labels and chips share
 * coordinates. `at` is where the label sits (its centre), `to` the point the line ends on.
 */
export const STAGE = { w: 720, h: 640 } as const;

export const CALLOUTS = [
  { id: 'ai', label: 'AI pick: says why', at: [96, 540], to: [150, 322] },
  { id: 'crew', label: 'Crew of 4 formed', at: [410, 604], to: [410, 520] },
  {
    id: 'featured',
    label: `Featured · ${DEMO.clicks.total.toLocaleString('en-US')} clicks`,
    at: [652, 100],
    to: [630, 22],
  },
] as const;

/** Chip centres in the same box (the demo-creator chip sits in the top-left corner, in CSS). */
export const CHIPS = {
  crew: [410, 520],
  credit: [490, 22],
} as const;

export const pct = (value: number, of: number) => `${(value / of) * 100}%`;
