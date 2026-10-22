// Static copy for the hero's "Ask your AI twin" chat and the auth panel's twin brief. Names, rooms and
// counts come from EXAMPLE, so the hero never disagrees with the sections below it. Example data: names are made up.

import { EXAMPLE } from './example-data';

function roomName(slug: string) {
  const found = EXAMPLE.rooms.find((entry) => entry.slug === slug);
  if (!found) throw new Error(`EXAMPLE.rooms has no ${slug}`);
  return found.name;
}

const read = 1240;
const rooms = EXAMPLE.rooms.length;

export interface TwinPick {
  id: string;
  /** What kind of thing it is, as a short tag. */
  kind: string;
  title: string;
  /** Where it came from: a room, or fan mail. */
  from: string;
  why: string;
}

/** The AI twin's week across all rooms (example), for the auth panel's card. */
export const TWIN_BRIEF = {
  read,
  rooms,
  needYou: 3,
  picks: [
    {
      id: 'lisbon',
      kind: 'Idea',
      title: EXAMPLE.idea.title,
      from: EXAMPLE.idea.community,
      why: `Budget-honest, and ${EXAMPLE.idea.use} would use it.`,
    },
    {
      id: 'fare-pals',
      kind: 'Fan business',
      title: 'Fare Pals, a fare-alert app',
      from: roomName('budget-travel'),
      why: 'Five fans built it. Ready to feature.',
    },
    {
      id: 'porto',
      kind: 'Collab pitch',
      title: 'Walk Porto with Inês',
      from: 'Fan mail',
      why: 'A local guide with real dates.',
    },
  ] satisfies TwinPick[],
} as const;

export interface ChatPick {
  title: string;
  why: string;
  /** Where the twin found it: a room name, or "Fan mail". */
  room: string;
  /** A short tag for a pick that is a kind of its own (the fan-built business). */
  tag?: string;
}

export interface TwinQuestion {
  id: string;
  question: string;
  /** The twin's first line, before the picks. */
  lead: string;
  picks: readonly ChatPick[];
}

/** The hero chat's three prewritten conversations, one per tab (example). */
export const TWIN_CHAT: readonly TwinQuestion[] = [
  {
    id: 'want',
    question: 'What do fans want next?',
    lead: `I read ${read.toLocaleString('en-US')} messages in your ${rooms} rooms this week. Three asks keep coming back:`,
    picks: [
      {
        title: EXAMPLE.idea.title,
        why: `${EXAMPLE.idea.use} fans said they would use it. Every price checked by a local.`,
        room: EXAMPLE.idea.community,
      },
      {
        title: 'A food map of Accra street stalls',
        why: 'Made by people who live there. Fits your one-dish-to-order style.',
        room: roomName('food-finds'),
      },
      {
        title: 'Let fans vote on next month’s trip',
        why: 'Every room gets a say. One post from you starts it.',
        room: 'Fan mail',
      },
    ],
  },
  {
    id: 'team',
    question: 'Who should I team up with?',
    lead: 'Three fans who already do the work you need:',
    picks: [
      {
        title: 'Inês Duarte',
        why: 'Local guide on the Lisbon crew. Pitched a Porto series with real dates.',
        room: EXAMPLE.idea.community,
      },
      {
        title: 'Maya Chen',
        why: 'Shot the film photo zine. Offered to do the Lisbon cover.',
        room: roomName('travel-photography'),
      },
      {
        title: 'Sana Iqbal',
        why: 'Joined 3 crews this fortnight. Her photos got 120 hearts.',
        room: roomName('solo-travelers'),
      },
    ],
  },
  {
    id: 'feature',
    question: 'What’s worth featuring?',
    lead: 'Finished by fans and ready for your spotlight:',
    picks: [
      {
        title: 'Fare Pals: fare alerts for $60-a-day trips',
        why: 'Five fans built and launched it. A small business, ready to feature.',
        room: roomName('budget-travel'),
        tag: 'Fan business',
      },
      {
        title: 'Pacific Coast van-life route',
        why: 'Five fans drove it and priced every campsite.',
        room: roomName('road-trips'),
      },
      {
        title: 'Solo-safe night markets map',
        why: 'Six fans checked every market after dark.',
        room: roomName('solo-travelers'),
      },
    ],
  },
];

/** The claim form's hint before anything is typed (hero-product, hero-claim-status). */
export const CLAIM_IDLE_TEXT =
  'Pick the link fans will use. You can leave it empty and choose later.';
