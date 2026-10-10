// Content for "For fans" (creator pivot spec §5, section 4). Demo names come from demo-data.ts.

import { DEMO } from './demo-data';
import { LIVE_JOIN } from './loop-live-data';

export interface FanStep {
  id: 'join' | 'feed' | 'team' | 'digest';
  title: string;
  line: string;
  /** The page the phone shows for this step, as the fan's in-app browser titles it. */
  pageTitle: string;
  path: string;
}

export const FAN_STEPS: readonly FanStep[] = [
  {
    id: 'join',
    title: 'Join in 60 seconds',
    line: 'Fans tap your bio link, add one line about themselves, and the AI suggests the rooms that fit, with a reason for each.',
    pageTitle: 'Join the space',
    path: `/${DEMO.creator.handle}/join`,
  },
  {
    id: 'feed',
    title: 'Share an idea',
    line: 'Fans post ideas, others say they would use them, and you can love the best ones.',
    pageTitle: 'Budget Travel',
    path: `/${DEMO.creator.handle}/c/budget-travel`,
  },
  {
    id: 'team',
    title: 'Join a crew',
    line: 'Every idea lists its open spots. A fan picks one and joins the crew.',
    pageTitle: 'Lisbon on $60 a day',
    path: `/${DEMO.creator.handle}/p/lisbon-on-60-a-day`,
  },
  {
    id: 'digest',
    title: 'Catch up in a minute',
    line: 'Each week the AI sums up what a room talked about, so fans see the top ideas without scrolling.',
    pageTitle: 'Budget Travel',
    path: `/${DEMO.creator.handle}/c/budget-travel`,
  },
] as const;

/** What the fan types on the Join screen; the AI picks the three rooms below from it. */
export const FAN_INTRO = LIVE_JOIN.intro;

/** The rooms the AI picks for that intro, each with its reason (the same picks the loop's phone shows). */
export const FAN_PICKS = LIVE_JOIN.picks.map(({ room, why }) => ({ slug: room.slug, why }));

/**
 * The weekly digest of Budget Travel, in the shape of the AI's community-digest task (a summary, up to
 * three themes, up to three standout posts with a reason). The Lisbon count comes from DEMO; the idea count,
 * the other two ideas and their counts are demo numbers made up for this screen (the screen says so).
 */
export const DIGEST = {
  ideas: 41,
  summary:
    'Fans swapped real prices for hostels, trams and street food. One idea turned into a crew of four.',
  themes: ['hostel prices', 'street food', 'solo safety'],
  top: [
    { title: DEMO.idea.title, why: 'Four roles filled', use: DEMO.idea.use },
    { title: 'Tokyo cafés under $5', why: 'Needs a photographer', use: 18 },
    { title: 'Montreal for under $250', why: 'Every price dated', use: 15 },
  ],
} as const;

/**
 * Scroll map for the pinned scene, in scene progress 0..1. Step i is active from STEP_STARTS[i] until the next
 * start; the last step also holds to the end so the scene can settle before it unpins.
 */
export const STEP_STARTS = [0, 0.22, 0.47, 0.72] as const;
