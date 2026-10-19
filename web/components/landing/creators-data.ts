// Content for "For creators" (creator pivot spec §5, section 5). Built from the demo in demo-data.ts; the
// extra lines here (quotes, reasons, tabs) describe the same Mira Lane demo space.

import { promoteDraft } from './demo-data';

export interface CreatorsStep {
  id: 'today' | 'fanmail' | 'spotlight';
  /** Anchor of the panel this step describes. */
  target: string;
  title: string;
  detail: string;
}

export const STEPS: CreatorsStep[] = [
  {
    id: 'today',
    target: 'creators-today',
    title: 'Your briefing',
    detail: 'One card at a time, with why.',
  },
  {
    id: 'fanmail',
    target: 'creators-fanmail',
    title: 'Fan mail',
    detail: 'Your best DMs, spam held back.',
  },
  {
    id: 'spotlight',
    target: 'creators-spotlight',
    title: 'Spotlight',
    detail: 'A post in your voice and a page crediting the crew.',
  },
];

/** The card on top of Today: the Lisbon guide, with the reason and the four actions. */
export const TODAY_CARD = {
  name: 'Priya Shah',
  context: 'Budget Travel',
  quote: '“I made a Lisbon guide on $60 a day.”',
  reason: 'matches budget-honest travel',
  score: 88,
  photo: 'fan-1',
} as const;

/** The card waiting under it. */
export const NEXT_CARD = {
  name: 'Inês Duarte',
  context: 'Collab',
  quote: '“Walk Porto’s old town with me for a 4-episode series.”',
  score: 82,
} as const;

export const TODAY_PULSE = 'Budget Travel: 41 new ideas.';

export interface FanMailRow {
  id: string;
  from: string;
  type: string;
  quote: string;
  reason: string;
  score: number;
}

/** The four best non-spam messages in the demo fan mail. */
export const FAN_MAIL_ROWS: FanMailRow[] = [
  {
    id: 'm1',
    from: 'Priya Shah',
    type: 'Idea',
    quote: 'Lisbon guide on $60 a day.',
    reason: 'Budget-honest travel.',
    score: 88,
  },
  {
    id: 'm2',
    from: 'Inês Duarte',
    type: 'Collab',
    quote: 'Walk Porto’s old town with me.',
    reason: 'Named local guide.',
    score: 82,
  },
  {
    id: 'm3',
    from: 'Casa Alfama Hotel',
    type: 'Brand deal',
    quote: 'Four nights in Lisbon, no script.',
    reason: 'Named owner.',
    score: 76,
  },
  {
    id: 'm10',
    from: 'Maya Chen',
    type: 'Collab',
    quote: 'Happy to shoot the Lisbon cover.',
    reason: 'Fills a crew spot.',
    score: 71,
  },
];

export const FAN_MAIL_TABS = [
  { label: 'All', active: true },
  { label: 'Collabs' },
  { label: 'Brand deals', wideOnly: true },
  { label: 'Ideas' },
  { label: 'Fan notes', wideOnly: true },
] as const;

export const FILTERED_COUNT = 4;

export const PLATFORM_TABS = ['Instagram', 'YouTube', 'TikTok'] as const;

const hashtagLine = promoteDraft.hashtags.map((tag) => `#${tag}`).join(' ');

const DRAFT_TEXT = 'Priya made a whole Lisbon guide on $60 a day.';

export const DRAFT = {
  text: DRAFT_TEXT,
  link: `fellowowners.app${promoteDraft.shortLink}`,
  hashtags: hashtagLine,
  count: DRAFT_TEXT.length + 1 + 22 + 1 + hashtagLine.length,
  limit: 2200,
};

/** Who made it, by role (the "Made by" block on the showcase page). */
export const CREDITS = [
  { role: 'Idea', name: 'Priya Shah' },
  { role: 'Local guide', name: 'Inês Duarte' },
  { role: 'Photographer', name: 'Maya Chen' },
  { role: 'Video editor', name: 'Leo Brandt' },
] as const;

export const SHOWCASE_PAGE = {
  path: 'fellowowners.app/mira/lisbon-on-60-a-day',
  status: 'Live',
};

export const PREVIEW = {
  title: 'Lisbon on $60 a day',
  meta: 'Budget Travel · Crew of 4',
};

/** Clicks per day for the link, Monday to Sunday (sums to promoteDraft.clicks). */
export const CLICKS_BY_DAY = [180, 260, 310, 370, 420, 410, 462];
export const CLICKS_TODAY = CLICKS_BY_DAY[CLICKS_BY_DAY.length - 1] ?? 0;

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}
