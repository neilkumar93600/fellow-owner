import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { LIMITS, type PitchType, type Tint } from '@fellow-owners/shared';
import type {
  SeedAiFields,
  SeedChallenge,
  SeedComment,
  SeedCommunity,
  SeedData,
  SeedMember,
  SeedPitch,
  SeedPost,
  SeedPromotion,
  SeedSpace,
} from './seed.js';

/**
 * One-off authoring tool: writes data/*.json, which is committed and then only read by seed.ts
 * (05-backend-schema section 9). Run it when the demo content should change, review the diff, and
 * commit the result. Nothing in the running app imports this file.
 *
 *   pnpm --filter @fellow-owners/api exec tsx src/db/seed/generate-content.ts
 *   pnpm --filter @fellow-owners/api exec tsx src/db/seed/generate-content.ts --check
 *
 * The demo world is Mira Lane, a Los Angeles lifestyle and travel vlogger, and six fan communities
 * (docs/superpowers/specs/2026-10-09-creator-pivot-design.md section 3).
 *
 * Everything comes out of one fixed seed (SEED below), so a run with no changes to this file
 * rewrites the same bytes: the diff shows what the edit actually changed and nothing else.
 * `--check` writes nothing and prints the counts, for a quick look before committing.
 * data/followers.json is hand-written and is not touched by this tool.
 *
 * ponytail: the prose is composed from the per-community clause banks below, not written by a
 * model. 05 section 9 describes an LLM pass here; a deterministic composer is what makes the
 * committed JSON reproducible and reviewable, and the live triage prompt is exercised against this
 * content by `pnpm db:seed --reanalyze` instead. To add a model pass, rewrite the bodies between
 * buildData() and writeData() and commit its output as usual.
 */

const SEED = 20_260_101;

/** Targets from 05 section 9 ("about N"). */
const TARGETS = { members: 1_200, posts: 140, comments: 400, pitches: 180, promotions: 2 } as const;

/** Members joined over this window, so the Fans and Today trends have a shape. */
const JOIN_WINDOW_DAYS = 84; // 12 weeks

// ---------------------------------------------------------------- seeded randomness

/** mulberry32: small, fast, good enough for content, and identical across Node versions. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

class Rng {
  private readonly next: () => number;

  constructor(seed: number) {
    this.next = mulberry32(seed);
  }

  float(): number {
    return this.next();
  }

  /** Integer in [min, max]. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('pick from an empty list');
    return items[Math.floor(this.next() * items.length)] as T;
  }

  /** `count` distinct items, in the list's own order. */
  sample<T>(items: readonly T[], count: number): T[] {
    const take = Math.min(count, items.length);
    const indices = new Set<number>();
    let guard = 0;
    while (indices.size < take && guard < 1000) {
      indices.add(Math.floor(this.next() * items.length));
      guard += 1;
    }
    return [...indices].sort((a, b) => a - b).map((i) => items[i] as T);
  }

  /** Skews towards 0: most values small, a few large (signal counts, follower-style curves). */
  skewed(max: number): number {
    return Math.floor(this.next() ** 2.2 * (max + 1));
  }
}

// ---------------------------------------------------------------- people vocabulary

const FIRST_NAMES = [
  'Aaliyah',
  'Aarav',
  'Adriana',
  'Ahmed',
  'Aisha',
  'Akira',
  'Alba',
  'Alex',
  'Amara',
  'Ana',
  'Andre',
  'Anika',
  'Ari',
  'Asha',
  'Ayo',
  'Bea',
  'Ben',
  'Bruno',
  'Camila',
  'Carlos',
  'Casey',
  'Chen',
  'Chloe',
  'Dani',
  'Dev',
  'Diego',
  'Dilan',
  'Eli',
  'Elena',
  'Emeka',
  'Emma',
  'Esha',
  'Farah',
  'Felix',
  'Gabriel',
  'Grace',
  'Hana',
  'Hari',
  'Hugo',
  'Ida',
  'Imran',
  'Ines',
  'Isabel',
  'Jae',
  'Jamal',
  'Jordan',
  'Jonas',
  'Jorge',
  'Joy',
  'Kai',
  'Kaito',
  'Kara',
  'Keiko',
  'Kemi',
  'Kiran',
  'Lara',
  'Leo',
  'Lin',
  'Lucia',
  'Luca',
  'Madison',
  'Maya',
  'Mei',
  'Milo',
  'Nadia',
  'Naveen',
  'Nia',
  'Niko',
  'Nina',
  'Noa',
  'Noor',
  'Olu',
  'Omar',
  'Oscar',
  'Paulo',
  'Pia',
  'Rahul',
  'Rania',
  'Ravi',
  'Reema',
  'Rhea',
  'Riley',
  'Rosa',
  'Ruby',
  'Sana',
  'Sara',
  'Sasha',
  'Seun',
  'Shreya',
  'Simon',
  'Sofia',
  'Tara',
  'Taylor',
  'Theo',
  'Tomas',
  'Tyler',
  'Uma',
  'Vikram',
  'Wei',
  'Yara',
  'Yuki',
  'Zara',
  'Zoe',
] as const;

const LAST_NAMES = [
  'Abara',
  'Acosta',
  'Adeyemi',
  'Ahmed',
  'Alvarez',
  'Ananth',
  'Anderson',
  'Bakshi',
  'Barros',
  'Bell',
  'Bhatt',
  'Bianchi',
  'Brooks',
  'Cardoso',
  'Carter',
  'Chandra',
  'Chen',
  'Costa',
  'Davis',
  'Dias',
  'Diallo',
  'Dubois',
  'Eze',
  'Fernandes',
  'Fischer',
  'Flores',
  'Garcia',
  'Gill',
  'Gomez',
  'Grewal',
  'Gupta',
  'Haddad',
  'Hassan',
  'Hayashi',
  'Hernandez',
  'Iqbal',
  'Jackson',
  'Jain',
  'Jensen',
  'Johnson',
  'Karim',
  'Kaur',
  'Khan',
  'Kim',
  'Kowalski',
  'Krishnan',
  'Lee',
  'Lima',
  'Lindgren',
  'Lopez',
  'Martin',
  'Mehta',
  'Mendes',
  'Menon',
  'Miller',
  'Moreau',
  'Morgan',
  'Nair',
  'Nakamura',
  'Nguyen',
  'Novak',
  'Obi',
  'Okafor',
  'Oliveira',
  'Ortiz',
  'Park',
  'Patel',
  'Pereira',
  'Petrov',
  'Quinn',
  'Ramirez',
  'Rao',
  'Reddy',
  'Reyes',
  'Ribeiro',
  'Rivera',
  'Rossi',
  'Saito',
  'Salim',
  'Sanchez',
  'Santos',
  'Schmidt',
  'Sen',
  'Sharma',
  'Silva',
  'Singh',
  'Sousa',
  'Suzuki',
  'Tanaka',
  'Taylor',
  'Thomas',
  'Torres',
  'Varma',
  'Vega',
  'Walker',
  'Wang',
  'Weber',
  'Williams',
  'Wright',
  'Yilmaz',
  'Young',
  'Zhang',
  'Ziani',
  'Okonkwo',
  'Haider',
] as const;

/** Fan-shaped headlines (80 characters at most), paired with the skills they imply. */
const PROFILES = [
  {
    headline: 'Teacher with six weeks off every summer',
    skills: ['itinerary planning', 'budgeting', 'packing light'],
  },
  {
    headline: 'Backpacker, three countries and counting',
    skills: ['hostels', 'budgeting', 'packing light'],
  },
  {
    headline: 'Photographer, mostly weddings, travels for fun',
    skills: ['photography', 'lightroom', 'lighting'],
  },
  { headline: 'Video editor, short form', skills: ['premiere', 'editing', 'motion'] },
  {
    headline: 'Local guide, walking tours in three languages',
    skills: ['local knowledge', 'walking tours', 'translation'],
  },
  {
    headline: 'Translator, Spanish and Portuguese',
    skills: ['translation', 'spanish', 'portuguese'],
  },
  {
    headline: 'Points-and-miles nerd, always hunting a fare',
    skills: ['points and miles', 'flight deals', 'budgeting'],
  },
  {
    headline: 'Van-lifer who wired the whole thing herself',
    skills: ['van conversion', 'camping', 'mechanics'],
  },
  {
    headline: 'Illustrator who sketches every trip',
    skills: ['illustration', 'procreate', 'journaling'],
  },
  {
    headline: 'Food writer, mostly street food',
    skills: ['food writing', 'photography', 'cooking'],
  },
  { headline: 'Student on a gap year', skills: ['budgeting', 'hostels', 'meeting people'] },
  { headline: 'Retired and finally traveling', skills: ['itinerary planning', 'slow travel'] },
  {
    headline: 'Hostel host in Mexico City',
    skills: ['hosting', 'local knowledge', 'spanish'],
  },
  {
    headline: 'Remote worker, a new city every month',
    skills: ['coworking', 'long stays', 'budgeting'],
  },
  {
    headline: 'Family of four, road trips every June',
    skills: ['family travel', 'campgrounds', 'itinerary planning'],
  },
  {
    headline: 'Marathon runner who races abroad',
    skills: ['running', 'packing light', 'planning'],
  },
  { headline: 'Yoga teacher on the retreat circuit', skills: ['yoga', 'wellness', 'hosting'] },
  {
    headline: 'Flight attendant, knows the cheap seats',
    skills: ['airlines', 'packing light', 'flight deals'],
  },
  { headline: 'Barista and full-time café hopper', skills: ['coffee', 'local cafes', 'food'] },
  { headline: 'Hiker who prefers the empty trail', skills: ['hiking', 'navigation', 'camping'] },
  {
    headline: 'Mechanic who builds camper vans',
    skills: ['mechanics', 'van conversion', 'electrical'],
  },
  {
    headline: 'Learning Italian this year',
    skills: ['italian', 'language exchange', 'translation'],
  },
  {
    headline: 'Solo traveler, forty countries and a bad knee',
    skills: ['solo travel', 'accessibility', 'budgeting'],
  },
  {
    headline: 'Copywriter for outdoor brands',
    skills: ['copywriting', 'storytelling', 'editing'],
  },
  {
    headline: 'Event planner, the friend who organizes group trips',
    skills: ['group trips', 'logistics', 'itinerary planning'],
  },
  { headline: 'Dog owner who travels with the dog', skills: ['pet travel', 'trails', 'camping'] },
  {
    headline: 'Travel nurse, a new city every 13 weeks',
    skills: ['relocating', 'local tips', 'budgeting'],
  },
  {
    headline: 'Cyclist planning a coast-to-coast ride',
    skills: ['cycling', 'route planning', 'camping'],
  },
  { headline: 'Night-train enthusiast', skills: ['rail travel', 'itinerary planning', 'europe'] },
  { headline: 'Architecture student sketching cities', skills: ['sketching', 'photography'] },
] as const;

const INTRO_OPENERS = [
  'Been following along for a while',
  'Long-time viewer, first time posting',
  'Here because of the Sunday vlogs',
  'Found this through a friend',
  'Joined after the last Q&A',
  'Lurker finally saying hello',
  'Watching since the early uploads',
  'Came for the Lisbon videos',
] as const;

const INTRO_WANTS = [
  'and I want to finally take the trip I keep planning',
  'and I am looking for two people to plan a trip with',
  'and I would like to help on someone else’s trip plan for once',
  'and I am happy to proofread a draft guide',
  'and I can give a few hours a week',
  'and I am after honest advice more than praise',
  'and I want to meet people who actually book the ticket',
  'and I am trying to get braver about going alone',
] as const;

// ---------------------------------------------------------------- communities and their topics

interface CommunityBank {
  slug: string;
  name: string;
  description: string;
  icon: SeedCommunity['icon'];
  tint: Tint;
  /** Relative share of members and posts. */
  weight: number;
  /** A thing and what it does for someone, kept together so a title and its body agree. */
  ideas: readonly { readonly thing: string; readonly does: string }[];
  problems: readonly string[];
  mechanics: readonly string[];
  asks: readonly string[];
  roles: readonly string[];
  tags: readonly string[];
  skills: readonly string[];
  audiences: readonly string[];
}

const COMMUNITIES: readonly CommunityBank[] = [
  {
    slug: 'budget-travel',
    name: 'Budget Travel',
    description: 'Real prices, cheap flights and trips that do not cost a month of rent.',
    icon: 'wallet',
    tint: 'peach',
    weight: 30,
    ideas: [
      {
        thing: 'a $45-a-day Mexico City guide',
        does: 'lists what a taco, a metro ride and a hostel bed really cost',
      },
      {
        thing: 'a shoulder-season flight thread',
        does: 'flags the cheap weeks to fly from the US to Europe',
      },
      {
        thing: 'a free-things map of Prague',
        does: 'pins forty museums, viewpoints and walking tours that cost nothing',
      },
      {
        thing: 'a hostel-versus-hotel cost sheet',
        does: 'works out which is cheaper once breakfast and laundry are counted',
      },
      {
        thing: 'a carry-on-only packing list for two weeks',
        does: 'saves the $70 checked-bag fee on every budget airline',
      },
      {
        thing: 'a points-and-miles starter guide',
        does: 'explains the one card and two habits behind a free flight to Tokyo',
      },
      {
        thing: 'a night-train guide for Europe',
        does: 'swaps a hotel night for a bed on the Vienna to Venice sleeper',
      },
      {
        thing: 'a Bangkok street-food budget crawl',
        does: 'eats well for $15 a day across five neighborhoods',
      },
      {
        thing: 'a long weekend from New York',
        does: 'gets to Montreal and back for under $250',
      },
      {
        thing: 'a travel-money cheat sheet',
        does: 'shows which cards skip foreign fees and which ATMs to avoid',
      },
      {
        thing: 'a cheap-flights Sunday thread',
        does: 'shares the three best fares found each week, with the dates',
      },
      {
        thing: 'a Japan rail pass breakdown',
        does: 'works out whether the pass is worth it for your actual route',
      },
    ],
    problems: [
      'Every "cheap" guide I found left out the tourist taxes and the airport transfer, so my real budget was off by a hundred dollars.',
      'I spent my first trip to Europe guessing, and the guessing cost me about $400.',
      'The numbers online are all from 2019 and nothing costs that now.',
      'Most blogs are written by someone whose flights were comped, and the budget shows it.',
      'I only get ten vacation days a year, so a mistake in the plan is one I pay for twice.',
      'It is hard to tell what is genuinely cheap and what only looks cheap.',
    ],
    mechanics: [
      'One table: what it cost, what I would skip, and what I would pay double for.',
      'Every price has a date next to it, so anyone can tell when it has gone stale.',
      'Day by day, with the cheapest option first and one splurge per trip.',
      'Fans add what they paid last month and the guide gets updated monthly.',
      'Everything fits on one phone-friendly page that works offline.',
      'Costs are shown in dollars and in the local currency, side by side.',
    ],
    asks: [
      'Looking for a local who can sanity-check the prices.',
      'I can write it up but need someone to turn it into a clean one-page layout.',
      'Need a photographer who has actually been there to make it look as good as it is.',
      'Would love two people who traveled there recently to fact-check the numbers.',
      'Could use a translator for the menus and the bus signs.',
      'Happy to run it myself, but I want a second pair of eyes before it goes public.',
    ],
    roles: ['Local guide', 'Itinerary planner', 'Photographer', 'Video editor', 'Translator'],
    tags: ['budget', 'flights', 'hostels', 'europe', 'points and miles'],
    skills: ['itinerary planning', 'budgeting', 'photography', 'video editing', 'translation'],
    audiences: [
      'first-time backpackers',
      'college students on spring break',
      'people with a week of vacation',
      'couples on a tight budget',
      'anyone flying out of the US on a budget',
    ],
  },
  {
    slug: 'solo-travelers',
    name: 'Solo Travelers',
    description: 'Going alone, safely, and meeting good people on the way.',
    icon: 'backpack',
    tint: 'lavender',
    weight: 22,
    ideas: [
      {
        thing: 'a solo check-in group',
        does: 'pairs two travelers in the same city so someone always knows where you are',
      },
      {
        thing: 'a first-solo-trip checklist',
        does: 'covers the twelve things I wish I had sorted before landing alone',
      },
      {
        thing: 'a list of women-friendly hostels',
        does: 'rates hostels on lighting, locks and how staff treat late arrivals',
      },
      {
        thing: 'a meet-people-on-the-road guide',
        does: 'lists the free walking tours and shared dinners where friends actually happen',
      },
      {
        thing: 'a solo dining guide for Tokyo',
        does: 'shows the counters and set-menu spots where eating alone is completely normal',
      },
      {
        thing: 'a "where I am this week" thread',
        does: 'lets solo travelers find each other in the same city',
      },
      {
        thing: 'a late-arrival plan',
        does: 'gets you from the airport to your bed safely after midnight',
      },
      {
        thing: 'a day-trip buddy board',
        does: 'finds someone to split a $90 tour with',
      },
      {
        thing: 'a phone-safety routine',
        does: 'covers backups, eSIMs and what to do if your phone is stolen',
      },
      {
        thing: 'a solo hiking primer',
        does: 'says which trails are fine alone and which are not',
      },
      {
        thing: 'an honest day-six thread',
        does: 'is a place to say the loneliness hits around day six, and what helped',
      },
      {
        thing: 'a travel-insurance explainer',
        does: 'compares the four plans that actually covered a broken wrist',
      },
    ],
    problems: [
      'The first night alone in a new city is the part nobody prepares you for.',
      'My family worries, and I would like to show them a real plan rather than say it will be fine.',
      'Most advice is written by people traveling in pairs.',
      'I never know which neighborhoods are okay after dark until I am standing in one.',
      'I have cancelled two solo trips because I could not find anyone to ask.',
      'The guides are either scary or breezy, and neither is true.',
    ],
    mechanics: [
      'A short check-in message once a day, sent to one person you chose.',
      'Real stories from people who did it last month, with the date and the city.',
      'A one-page card you can screenshot and keep offline.',
      'Small groups of three to five, matched by city and dates.',
      'A simple yes-or-no list for each place: lighting, locks, late check-in, staff.',
      'Everything is updated by the people who were there most recently.',
    ],
    asks: [
      'Looking for three people who have traveled solo in Asia to review it.',
      'Need a local who can tell me which neighborhoods are fine at night.',
      'Want someone to translate the safety phrases into Spanish and Portuguese.',
      'Looking for a host who will run the weekly check-in thread.',
      'Would love an illustrator to make the checklist look friendly rather than scary.',
      'Happy to start it, but I want one more person so it does not depend on me.',
    ],
    roles: ['Local guide', 'Host', 'Translator', 'Illustrator', 'Itinerary planner'],
    tags: ['solo travel', 'safety', 'hostels', 'first trip', 'meeting people'],
    skills: ['hosting', 'translation', 'local knowledge', 'illustration', 'itinerary planning'],
    audiences: [
      'first-time solo travelers',
      'women traveling alone',
      'people on a gap year',
      'anyone nervous about a first solo trip',
      'digital nomads on a short stay',
    ],
  },
  {
    slug: 'travel-photography',
    name: 'Travel Photography',
    description: 'Better trip photos, on a phone or a camera, and where the light falls.',
    icon: 'camera',
    tint: 'aqua',
    weight: 14,
    ideas: [
      {
        thing: 'a golden-hour map of Lisbon',
        does: 'marks where the light is best and what time to arrive',
      },
      {
        thing: 'a phone-only photo guide',
        does: 'gets sharp travel shots without a $2,000 camera',
      },
      {
        thing: 'an editing preset pack',
        does: 'matches the warm look of the vlog in one tap',
      },
      {
        thing: 'a crowd-free sunrise list',
        does: 'shows eight famous spots that are empty before 7am',
      },
      {
        thing: 'a street-portrait etiquette guide',
        does: 'explains how to ask, what to say and when to put the camera away',
      },
      {
        thing: 'a carry-on camera kit list',
        does: 'fits a camera, two lenses and a tripod under the cabin weight limit',
      },
      {
        thing: 'a monthly photo walk',
        does: 'gets ten fans shooting the same neighborhood and sharing one frame each',
      },
      {
        thing: 'a night-market photo guide',
        does: 'covers low-light settings that work at a busy stall',
      },
      {
        thing: 'a before-and-after edit series',
        does: 'shows the five-minute edit behind a flat shot',
      },
      {
        thing: 'a drone-rules cheat sheet',
        does: 'lists where you can and cannot fly in twelve popular cities',
      },
      {
        thing: 'a photo-trade swap',
        does: 'pairs a local photographer with a traveler who will be in their city',
      },
      {
        thing: 'a shot-list template',
        does: 'plans the ten must-have frames of a trip before you leave',
      },
    ],
    problems: [
      'My trip photos look flat and I cannot work out why.',
      'The famous spots are packed by nine, and I do not have the time to scout.',
      'Everything online assumes expensive gear, and I shoot on a phone.',
      'I take four hundred photos and keep six.',
      'I never know if it is okay to photograph the people I meet.',
      'Presets that work on one photo wreck the next.',
    ],
    mechanics: [
      'One page per spot: where to stand, when to arrive, what to skip.',
      'Before and after side by side, with the exact settings underneath.',
      'Ten shots each, one theme, shared in a single album at the end of the month.',
      'Plain-English tips with a sample photo for every one.',
      'A shared map anyone can add a pin to, with the time of day.',
      'Every preset comes with a note on which light it was made for.',
    ],
    asks: [
      'Looking for a photographer who knows the city well.',
      'Need someone to edit the examples into a short video.',
      'Want a second photographer to say where my advice is wrong.',
      'Would love an illustrator for the map.',
      'Need a local who can confirm the opening times.',
      'Happy to organize it, but I need someone to lead the first walk.',
    ],
    roles: ['Photographer', 'Video editor', 'Local guide', 'Illustrator'],
    tags: ['photography', 'editing', 'golden hour', 'phone photos', 'presets'],
    skills: ['photography', 'photo editing', 'video editing', 'lightroom', 'illustration'],
    audiences: [
      'phone photographers',
      'beginners with a first camera',
      'weekend travelers',
      'people who want better vacation photos',
    ],
  },
  {
    slug: 'food-finds',
    name: 'Food Finds',
    description: 'Small family-run spots, street food and the one dish to order.',
    icon: 'utensils',
    tint: 'peach',
    weight: 14,
    ideas: [
      {
        thing: 'a family-run restaurant list for Oaxaca',
        does: 'finds the places where the grandmother is still in the kitchen',
      },
      {
        thing: 'a $10-meal map',
        does: 'pins the best lunch under ten dollars in your city',
      },
      {
        thing: 'a night-market eating order',
        does: 'tells you what to eat first, second and last',
      },
      {
        thing: 'a street-food safety guide',
        does: 'explains how to pick a stall that is safe and still good',
      },
      {
        thing: 'a menu translator for Seoul',
        does: 'covers the twenty words that decide what you end up eating',
      },
      {
        thing: 'a breakfast-around-the-world thread',
        does: 'shows what locals eat before nine in ten cities',
      },
      {
        thing: 'a cooking-class swap',
        does: 'matches fans with a home cook who teaches one dish for a small fee',
      },
      {
        thing: 'a vegetarian guide to Tokyo',
        does: 'finds ramen and izakaya places that are truly meat-free',
      },
      {
        thing: 'a market-day itinerary',
        does: 'builds a whole day around one covered market',
      },
      {
        thing: 'an independent café passport',
        does: 'collects stamps from non-chain coffee shops in a city',
      },
      {
        thing: 'a regional-dish checklist',
        does: 'lists the five dishes you cannot get anywhere else in Portugal',
      },
      {
        thing: 'a food-allergy phrase card',
        does: 'tells a kitchen about your allergy in six languages',
      },
    ],
    problems: [
      'The top-ranked restaurants are all the same ones with a forty-minute wait.',
      'I have eaten at tourist traps in three countries and I still end up at the same blogs.',
      'I want to eat where locals eat, but I do not speak the language well enough to ask.',
      'The family places do not have websites, so nobody can find them.',
      'I get stuck on whether a stall is safe, and then I just eat at a chain.',
      'Reviews are full of people who ate one meal and left five stars.',
    ],
    mechanics: [
      'Each place gets a name, a street, a price and the one dish to order.',
      'Only places a fan has eaten at in the last six months.',
      'Photos taken by the person who ate there, not the restaurant.',
      'A card with the order of the dishes, written in the local language.',
      'Opening hours checked by a local before it goes in.',
      'Prices in dollars and local currency, with the date.',
    ],
    asks: [
      'Looking for a local who can check the addresses.',
      'Need a translator for the menu words.',
      'Want a photographer who will shoot the food in daylight.',
      'Looking for someone with a food-allergy background to review the card.',
      'Need a host to run the first tasting evening.',
      'Happy to collect the places, but I want a second person to keep it honest.',
    ],
    roles: ['Local guide', 'Translator', 'Photographer', 'Host', 'Video editor'],
    tags: ['food', 'street food', 'local', 'markets', 'vegetarian'],
    skills: ['local knowledge', 'translation', 'photography', 'hosting', 'video editing'],
    audiences: [
      'food-obsessed travelers',
      'vegetarians on the road',
      'people who hate tourist traps',
      'families with picky eaters',
    ],
  },
  {
    slug: 'road-trips',
    name: 'Road Trips & Van Life',
    description: 'Long drives, cheap campsites and what the van really costs.',
    icon: 'car',
    tint: 'white',
    weight: 12,
    ideas: [
      {
        thing: 'a Pacific Coast Highway week',
        does: 'plans seven days from San Francisco to San Diego for about $900',
      },
      {
        thing: 'a national-parks pass guide',
        does: 'works out when the $80 annual pass pays for itself',
      },
      {
        thing: 'a van-conversion cost sheet',
        does: 'lists what a basic build really costs, down to the screws',
      },
      {
        thing: 'a free-camping map',
        does: 'pins legal dispersed sites between Utah and Oregon',
      },
      {
        thing: 'a one-song-per-state playlist',
        does: 'collects a road-trip soundtrack from fans across the country',
      },
      {
        thing: 'a Route 66 stop list',
        does: 'picks twelve diners and motels still worth a detour',
      },
      {
        thing: 'a fuel-budget calculator',
        does: 'shows what a 2,000-mile trip costs in a truck, a van and a hybrid',
      },
      {
        thing: 'a campground booking calendar',
        does: 'tells you when the summer sites open and how fast they go',
      },
      {
        thing: 'a winter van-heating guide',
        does: 'keeps you warm at 15 degrees without a headache',
      },
      {
        thing: 'a break-down kit',
        does: 'covers the twelve things worth carrying in the middle of Nevada',
      },
      {
        thing: 'a dog-friendly road-trip list',
        does: 'finds rest stops, trails and patios that welcome dogs',
      },
      {
        thing: 'a Southwest loop',
        does: 'strings together Zion, Bryce, Arches and Moab in nine days',
      },
    ],
    problems: [
      'I have the van and no idea where it is legal to sleep.',
      'Everything online is either a luxury build or a nightmare story.',
      'Gas, tolls and park fees add up faster than I expected.',
      'Cell signal disappears and so does the plan.',
      'I would like to go with someone, and my friends can only do a weekend.',
      'Campsites book out months ahead and I only find out afterwards.',
    ],
    mechanics: [
      'A route you can follow day by day, with the miles and the drive times.',
      'An honest costs table: fuel, camping, food and the one thing that broke.',
      'Maps that download for offline use.',
      'Every stop has a note on cell signal and water.',
      'A packing list that fits in one tote.',
      'One printable page for the glovebox.',
    ],
    asks: [
      'Looking for someone who has done this route in the last year.',
      'Need a video editor to cut the drive footage into something watchable.',
      'Want a photographer to join for the Utah leg.',
      'Looking for a mechanic-minded fan to check the maintenance list.',
      'Need a host who can run the meetup at the first campsite.',
      'Happy to plan it, but I want a second driver.',
    ],
    roles: ['Itinerary planner', 'Photographer', 'Video editor', 'Local guide', 'Host'],
    tags: ['road trip', 'van life', 'camping', 'national parks', 'budget'],
    skills: ['itinerary planning', 'photography', 'video editing', 'mechanics', 'local knowledge'],
    audiences: [
      'weekend road-trippers',
      'first-time van lifers',
      'families with a long weekend',
      'people driving cross-country',
    ],
  },
  {
    slug: 'slow-living',
    name: 'Slow Living',
    description: 'Staying longer, going slower, and coming home rested.',
    icon: 'sunrise',
    tint: 'lavender',
    weight: 8,
    ideas: [
      {
        thing: 'a one-city month',
        does: 'shows what four weeks in Porto costs instead of seeing six cities in nine days',
      },
      {
        thing: 'a slow-morning routine',
        does: 'starts a travel day with a walk and a coffee instead of a checklist',
      },
      {
        thing: 'a neighborhood-in-a-day walk',
        does: 'sees one district properly, on foot',
      },
      {
        thing: 'a travel journaling prompt pack',
        does: 'turns a train ride into three good pages',
      },
      {
        thing: 'a no-itinerary weekend',
        does: 'plans only the first night and the last meal',
      },
      {
        thing: 'a language-in-a-month plan',
        does: 'gets you ordering lunch in Italian in thirty days',
      },
      {
        thing: 'a village-stay guide',
        does: 'finds family-run guesthouses under $60 a night',
      },
      {
        thing: 'a phone-free afternoon',
        does: 'tests a whole day abroad with the screen off',
      },
      {
        thing: 'a seasonal travel calendar',
        does: 'tells you where to be in March, June and October',
      },
      {
        thing: 'a letters-to-yourself series',
        does: 'collects postcards to open six months after the trip',
      },
    ],
    problems: [
      'I came home from my last trip more tired than when I left.',
      'I tried to see everything and remember almost none of it.',
      'The itineraries online are minute-by-minute and I just want a rhythm.',
      'I do not know how to stay somewhere longer without it feeling like a mistake.',
      'It is hard to switch off when everyone else is posting a new city every day.',
      'I want a trip I can describe by how it felt, not how many stamps it has.',
    ],
    mechanics: [
      'One anchor per day, and everything else optional.',
      'Four weeks in one place, with a weekly budget on top.',
      'A short note each evening, written by hand and photographed.',
      'A shared weekly thread where people post one slow moment.',
      'Starts with six people and grows only if it keeps feeling good.',
      'Plans that fit on an index card.',
    ],
    asks: [
      'Looking for someone who has lived somewhere for a month to share what they learned.',
      'Need an illustrator for the journaling pages.',
      'Want a host who will keep the weekly thread kind.',
      'Looking for a local to suggest the quiet hours in their town.',
      'Need a photographer to catch ordinary mornings.',
      'Happy to write it, but I want a second voice.',
    ],
    roles: ['Host', 'Illustrator', 'Photographer', 'Local guide', 'Itinerary planner'],
    tags: ['slow travel', 'journaling', 'long stays', 'wellbeing', 'village stays'],
    skills: ['hosting', 'illustration', 'photography', 'writing', 'local knowledge'],
    audiences: [
      'burned-out travelers',
      'people with a month to spare',
      'remote workers',
      'retirees planning a long trip',
    ],
  },
] as const;

// ---------------------------------------------------------------- Mira's space

const SPACE: SeedSpace = {
  handle: 'mira',
  displayName: 'Mira Lane',
  bio: 'Slow travel, cheap flights, and the people I meet on the way. Six rooms where my viewers plan, shoot and explore together.',
  avatarUrl: '/demo/mira.jpg',
  platforms: [
    { platform: 'youtube', url: 'https://youtube.com/@miralane', followers: 620_000 },
    { platform: 'instagram', url: 'https://instagram.com/miralane', followers: 380_000 },
    { platform: 'tiktok', url: 'https://tiktok.com/@miralane', followers: 140_000 },
  ],
  tasteProfile: {
    promote: [
      'budget-honest travel, with real prices and the receipts',
      'local guides written by people who actually live there',
      'solo-travel safety that is practical, not scary',
      'small family-run food spots over famous restaurants',
      'collabs with a named owner and a date',
      'beginner-friendly photo and editing tips',
    ],
    never: [
      'crypto, tokens and anything with a presale',
      'bought followers and engagement pods',
      '"free cruise" giveaways and prize scams',
      'MLM and dropshipping pitches',
      'paid reviews of places she has not been',
    ],
    voice: [
      'Day four in Porto and I have spent $38. Here is the receipt for every coffee, the tram I should have skipped, and the one meal I would pay double for.',
      'No sponsored sunsets here. I film what I would have filmed anyway, and I tell you when the place was not worth the flight.',
      'If you are waiting until you feel brave enough to go alone: I have done eleven solo trips and I was nervous at every airport. Book the ticket anyway, then make the plan.',
    ],
  },
};

/** The lines the AI cites as "why this one". They are the space's own taste-profile lines. */
const PROMOTE_LINES = SPACE.tasteProfile.promote;

/**
 * The demo fan (03-app-flow J7). The email must match DEMO_FAN_EMAIL (env.ts default is priya@example.com).
 */
const DEMO_FAN = {
  name: 'Priya Shah',
  email: 'priya@example.com',
  headline: 'Austin solo traveler who plans every trip around food',
  intro:
    'Long-time viewer, first time posting. Austin-based, eleven countries so far, mostly alone and mostly for the food. Happy to help plan someone else’s trip too.',
  skills: ['itinerary planning', 'budgeting', 'food writing'],
  communities: ['budget-travel', 'solo-travelers', 'food-finds'],
} as const;

// ---------------------------------------------------------------- pitch vocabulary

interface PitchBank {
  type: PitchType;
  /** Relative share of the ~180 pitches. */
  weight: number;
  spam?: boolean;
  /** Subject and body stay together: a pitch's subject has to describe its own body. */
  messages: readonly { readonly subject: string; readonly body: string }[];
}

const PITCHES: readonly PitchBank[] = [
  {
    type: 'collab',
    weight: 26,
    messages: [
      {
        subject: 'A free walking tour in Lisbon this October',
        body: 'I run a small walking-tour company in Lisbon and your Budget Travel room keeps asking for exactly what we do. Would you be up for a free walking tour with a few of your fans in October? I would cover the guide, the pastel de nata stop and the filming permit. You keep full say on what goes out.',
      },
      {
        subject: 'Swap a video with my slow-travel channel',
        body: 'I make slow-travel videos for about 90K people, mostly in Portugal and Spain. Straight swap: one video each, on each other’s channel, same week. I have done two of these before and one clearly worked better than the other, so I will be honest about what to expect.',
      },
      {
        subject: 'A fan-made Tokyo food map, filmed by us',
        body: 'We are a two-person video team in Osaka. Your Food Finds fans keep describing a Tokyo food map for people on $30 a day, and nobody has made it. We would film it with them, for free, if you would feature it. No logo on anything.',
      },
      {
        subject: 'Guest spot at our spring van-life weekend',
        body: 'We host a van-life weekend in Joshua Tree each spring, around 80 people, mostly beginners. Would you drop in for a Saturday talk? We cover your gas and a campsite, nothing else, and you can leave the minute it stops being fun.',
      },
      {
        subject: 'A sunrise photo walk in Mexico City',
        body: 'I am a photographer in Mexico City and I run a monthly sunrise photo walk. Your Travel Photography room would be a perfect fit. I would like to host a walk for ten of your fans, free, with you joining by video if you cannot make it in person.',
      },
      {
        subject: 'Meet us for one leg of the Pacific Coast Highway',
        body: 'Two of us are driving the Pacific Coast Highway in May and filming it. We would love you to meet us for one leg, and your fans can choose the stops. We will split the filming and hand you the raw clips either way.',
      },
      {
        subject: 'Translating the fan-made Lisbon guide into Portuguese',
        body: 'I am a translator in Porto. I would like to translate the fan-made Lisbon guide into Portuguese so locals can correct it too. Credited, linked back, and I will send you the draft first. No fee.',
      },
      {
        subject: 'A free online cooking class for Food Finds',
        body: 'I teach home-style Oaxacan cooking in a small kitchen. I would like to run one free online class for your Food Finds fans, and if you want to film it, it is yours. All I ask is a link to my class list at the end.',
      },
    ],
  },
  {
    type: 'brand_deal',
    weight: 13,
    messages: [
      {
        subject: 'Two sponsored videos, $4,500, creative control is yours',
        body: 'We make carry-on luggage and would like to sponsor two of your videos this spring. $4,500 for the pair, you keep creative control, and the bag only appears where it fits the trip. I am happy to send one first so you can say no if it is not right.',
      },
      {
        subject: 'Affiliate link for our travel insurance comparison',
        body: 'We run a travel insurance comparison site. We would like to give your viewers a custom link and pay you 12 percent of each policy. We do not ask you to say anything you do not believe, and you can see our claims record before you decide.',
      },
      {
        subject: 'Four nights at our Lisbon hotel, no script',
        body: 'We run a 14-room boutique hotel in Lisbon. We would host you for four nights with no script, and you tell the truth about the stay, including what you do not like. Nothing in writing about what you must say.',
      },
      {
        subject: 'Budget national-parks series, $9,000 for three videos',
        body: 'Our outdoor retailer would like to fund a three-part series on budget national park trips. $9,000 for three videos, and your audience gets a free park-pass guide at the end. You pick the parks.',
      },
      {
        subject: 'Six months with our travel eSIM, $1,800 a month',
        body: 'We sell travel eSIMs and want an ongoing partner rather than a one-off. $1,800 a month for a mention in the description and one dedicated segment a quarter. We will send you a plan so you can test the coverage on a real trip first.',
      },
      {
        subject: 'Creator trip to northern Portugal in September',
        body: 'On behalf of a regional tourism board we are putting together a creator trip to northern Portugal. Flights and hotels are covered, plus a $3,000 production fee. We ask for two videos and a few stories; the edit is yours.',
      },
      {
        subject: 'A year as one of six camera ambassadors',
        body: 'Our mirrorless camera brand is looking for six creators for a year-long ambassador program. You would get a body and two lenses and $2,500 for content across the year. We need you to actually like the camera, which is why we send it ahead.',
      },
      {
        subject: 'Night-train passes for you and a friend, $5,000',
        body: 'We are a rail pass company and we would like your Budget Travel fans to see how a night-train trip works. $5,000 and two free passes for you and a friend. We will not ask for approval on the video.',
      },
    ],
  },
  {
    type: 'idea',
    weight: 13,
    messages: [
      {
        subject: 'A week in Vietnam on $50 a day',
        body: 'Three of us in Budget Travel keep describing the same trip: a week in Vietnam on fifty dollars a day, Hanoi to Hoi An. If you did it with a few of us following along, I think it would be the most useful thing on your channel. I would help plan the route.',
      },
      {
        subject: 'A "my first solo trip" starter series',
        body: 'A lot of the Solo Travelers posts are people asking if they are ready. What if you made a short series that follows one nervous first-timer from booking to landing? Not a perfect trip, a real one. I would volunteer and so would at least four others.',
      },
      {
        subject: 'Let fans vote on your next destination',
        body: 'What if the next big trip was chosen by a vote in Solo Travelers, and the winning plan was built by fans in the room? Small change, but it would turn the whole room into a crew. I would organize the vote if nobody else wants to.',
      },
      {
        subject: 'A packing-list teardown video',
        body: 'Fans send in their packing lists and you cut the weight in half, live. People love watching someone else’s suitcase get edited. I would send you mine and it is, frankly, a mess.',
      },
      {
        subject: 'Visit the places your fans recommend, one per month',
        body: 'Pick one fan recommendation every month and go there, with the fan as your local guide for the day. It makes the community the star and it solves the problem of deciding where to go.',
      },
      {
        subject: 'A live Q&A from a night train',
        body: 'This is an odd one, but a live Q&A from a night train from Vienna to Venice sounds amazing. Bad wifi, a tiny cabin and a thousand questions. I would join in from my seat in Austin.',
      },
    ],
  },
  {
    type: 'press',
    weight: 6,
    messages: [
      {
        subject: 'Interview for a piece on slow travel',
        body: 'I am writing a piece on creators who build communities rather than audiences, and yours comes up a lot. Twenty minutes on a call, or over email if you prefer. I will send quotes back before anything is published.',
      },
      {
        subject: 'A quote for a story on budget travel this summer',
        body: 'We are running a story on what travel really costs this summer. I would like a quote from someone who has been publishing real prices for years. Happy to work entirely over email, and I will not use anything you have not seen.',
      },
      {
        subject: 'Podcast invitation, 40 minutes',
        body: 'Our podcast does 40-minute conversations, no pre-interview, lightly edited. I would want to spend most of it on the six-rooms decision rather than the usual growth questions. We record Tuesdays and Thursdays.',
      },
      {
        subject: 'Profile for our Sunday travel section',
        body: 'I write the Sunday profile for a small publication, about 2,000 words. I would need two conversations and permission to speak to three people from your communities. You would see the piece before it ran.',
      },
    ],
  },
  {
    type: 'fan_note',
    weight: 28,
    messages: [
      {
        subject: 'I booked my first solo trip',
        body: 'No ask here. I watched your Lisbon episode six times, and last month I booked my first solo trip: ten days in Portugal, $1,400 all in. I am terrified and very excited. Thank you for making it feel possible.',
      },
      {
        subject: 'Your laundry tip saved me $200',
        body: 'I just wanted to say your note about checking the laundry fees saved me about $200 across a month in Southeast Asia. Tiny detail, big difference.',
      },
      {
        subject: 'My mum finally came with me',
        body: 'I used your slow-travel itinerary for a week in Sicily with my mum. We did one thing a day and she said it was the best trip of her life. That is all. Thank you.',
      },
      {
        subject: 'Stayed for the honest days',
        body: 'I started watching for the pretty shots and stayed for the day you admitted you were lonely in Seoul. I told my sister, and she said she feels exactly the same on trips. We are going together in March.',
      },
      {
        subject: 'The stall owner in Taipei remembered your viewers',
        body: 'I ate at the night-market stall you mentioned and the owner told me another of your viewers had been the week before. She asked if you were coming. I said not yet. Wanted you to know that people remember.',
      },
      {
        subject: 'No ask, just thanks',
        body: 'I joined Budget Travel in February, helped two people with their Lisbon budgets, and that is the most useful I have felt online in years. Just saying thanks.',
      },
      {
        subject: 'The carry-on list worked',
        body: 'Eleven days, one carry-on, zero checked-bag fees. I used your list almost exactly. Thought you would want to know it landed with a real person.',
      },
      {
        subject: 'Here for the Sunday vlogs',
        body: 'Found you through a friend and stayed for the Sunday vlogs. I have no trip planned and no plan to plan one, and I still get something out of every upload.',
      },
    ],
  },
  {
    type: 'other',
    weight: 3,
    messages: [
      {
        subject: 'Question about the Solo Travelers rules',
        body: 'Quick question rather than a pitch: are the Solo Travelers check-in threads open to people who travel with a partner part of the time? I do not want to clutter it if it is not meant for me.',
      },
      {
        subject: 'Can I add Spanish subtitles to one of your videos',
        body: 'Would you mind if I added Spanish subtitles to one of your videos for a small group I teach? Credited and linked back, and I would send you the file first.',
      },
      {
        subject: 'Accessibility problem on the join page',
        body: 'Not a pitch: the join page is hard to use with a screen reader, specifically the community picker. I am happy to write up exactly what I hit if that is useful to whoever looks after the site.',
      },
    ],
  },
  {
    type: 'other',
    weight: 11,
    spam: true,
    messages: [
      {
        subject: 'Buy 10K followers today',
        body: 'Hello Creator! Buy 10K followers for just $49. Real-looking accounts, delivered in 24 hours, no password needed. Limited slots this week. Reply YES and we will send the payment link right away.',
      },
      {
        subject: 'Free cruise giveaway, claim in 24h',
        body: 'CONGRATULATIONS! You have been selected for a FREE 7-night Caribbean cruise for two. Claim within 24 hours or it goes to the next creator. Click here and enter your passport number to confirm your booking.',
      },
      {
        subject: 'Exclusive token presale for travel creators',
        body: 'Dear Partner, our token presale closes Friday and we have reserved an allocation for selected travel creators. Expected 40x at listing. All you need to do is post once to your audience. Payment in USDT up front. This is not financial advice.',
      },
      {
        subject: 'We can rank you #1 on Google',
        body: 'Hi, I noticed your website is not ranking for your main keywords. Our team can guarantee page one on Google in 60 days using 5,000 high authority backlinks. First month is half price. Let me know a good time to call.',
      },
      {
        subject: 'Make $5,000/week from home',
        body: 'Work from home opportunity! Start your own dropshipping travel-gear store with our members, who make $5,000 per week with just 2 hours a day. No experience needed. Join 40,000 others. Click the link to claim your spot before registration closes.',
      },
      {
        subject: 'Your account qualifies for verification',
        body: 'URGENT: Your account has been selected for verified status. To complete the process please confirm your login details at the secure link below within 24 hours or the opportunity will be passed to another creator.',
      },
      {
        subject: 'Join our engagement pod: 500 travel creators',
        body: 'Join our engagement pod. 500 travel creators like and comment on every post within 10 minutes. Guaranteed reach boost for $25 a month. Everyone is doing it, so you will fall behind if you do not.',
      },
      {
        subject: 'Paid five-star review for our resort, no visit needed',
        body: 'We will pay $600 for a five-star video review of our resort. No need to visit, we send you photos and talking points. Payment in gift cards. Reply today, we only have three slots left.',
      },
    ],
  },
] as const;

/** Mira's replies, by pitch type, so a reply always matches what it answers. */
const REPLIES: Record<PitchType, readonly string[]> = {
  collab: [
    'Thank you for this. Yes to the meetup, but let us start with ten people and see who turns up.',
    'This is a yes from me. One condition: you keep your edit and I keep mine, and nobody approves anybody’s words.',
    'Not right now, and the reason is my calendar rather than the idea. Ask me again after the summer.',
    'I would rather do the small version first. One walk, filmed, and we decide afterwards.',
  ],
  brand_deal: [
    'Thank you for writing. I only take deals where I have used the thing first, so please send it over and I will tell you honestly if it fits.',
    'This is not the right fit for the channel right now, but I appreciate the clear numbers. I will keep your name for when that changes.',
    'I would like to do this, with one change: no script, and I say what I really think. If that works, send the details.',
  ],
  idea: [
    'I love this. Start it in the room and I will pin it as soon as a few people have joined in.',
    'Great idea. I cannot make it myself, but I will feature whoever does.',
    'This is exactly what the rooms are for. Post it as a crew call and I will point people to it.',
  ],
  press: [
    'Happy to talk. Email is easiest, and please send quotes back before anything goes out.',
    'Thank you for asking. I can do twenty minutes on a Thursday.',
  ],
  fan_note: [
    'This made my day. Thank you for writing, and please send photos from the trip.',
    'Reading this on a train. Thank you, truly.',
    'Notes like this are the reason I read every message. Thank you.',
  ],
  other: [
    'Good question: yes, partners and part-time solo travelers are welcome in the check-in thread.',
    'Yes, please do. Send me the file and I will say thanks properly.',
    'Thank you for telling me. I have passed it on and we are fixing it this week.',
  ],
};

const COMMENT_OPENERS = [
  'This is the part I keep getting wrong',
  'Strong yes from me',
  'I tried something close to this in March',
  'Worth saying the quiet part',
  'One worry',
  'Happy to help with this',
  'I did almost this last spring',
  'Small note',
  'This would have saved me a weekend',
  'Pushing back slightly',
  'Count me in',
  'Just back from there',
] as const;

const COMMENT_BODIES = [
  'the scope is right and the ask is clear, which is rarer than it should be.',
  'and the version that worked was the one with fewer stops, not more.',
  'prices from last year are already wrong. Put a date next to every number.',
  'if nobody owns the first draft it will stay a thread forever.',
  'I can take the part nobody wants, which I assume is checking the addresses.',
  'I was there last month and the opening hours have changed. Happy to send photos.',
  'the weekly update is the whole point. The rest is setup.',
  'start with five people who answer their messages. Fifty strangers is worse.',
  'give it a name last. It will change once you see it working.',
  'I would cut the second half and publish the first. The second half is a different guide.',
  'put the honest downsides near the top. That is what people come back for.',
  'two people minimum. If one person gets sick, the whole thing stops.',
  'the number nobody tracks is what it costs to get to the airport.',
  'honestly the simple version is the one I would actually use on the road.',
  'I can translate the signs and the menu words if that helps.',
  'late arrivals are the real risk here. Add a plan for after midnight.',
] as const;

// ---------------------------------------------------------------- composition

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "A $45-a-day Mexico City guide for first-time backpackers" / "... that lists what a taco costs". */
type Idea = CommunityBank['ideas'][number];

/**
 * One post = one idea. The title and the body's first sentence are built from the same
 * `{ thing, does }` pair, so the body never opens by describing something else.
 */
function title(rng: Rng, bank: CommunityBank, idea: Idea): string {
  switch (rng.int(0, 2)) {
    case 0:
      return capitalize(`${idea.thing} for ${rng.pick(bank.audiences)}`);
    case 1:
      return capitalize(`${idea.thing} that ${idea.does}`).slice(0, LIMITS.post.title.max);
    default:
      return capitalize(
        `${idea.thing}, ${rng.pick(['made by fans', 'with real prices', 'on one page', 'for a long weekend', 'the honest version'])}`,
      );
  }
}

function body(rng: Rng, bank: CommunityBank, idea: Idea, withAsk: boolean): string {
  const parts = [
    capitalize(`${idea.thing} that ${idea.does}.`),
    rng.pick(bank.problems),
    rng.pick(bank.mechanics),
  ];
  if (withAsk) parts.push(rng.pick(bank.asks));
  return parts.join(' ');
}

const SECOND_SENTENCES = [
  'Scope is one weekend’s worth of work.',
  'The ask is specific and small.',
  'Has a date and a named owner.',
  'Beginner-friendly, which Mira promotes.',
  'Real prices, which Mira always asks for.',
] as const;

/** Words too common in this travel space to count as a match on their own. */
const MATCH_STOPWORDS = new Set(
  'about actually also anything been could from have here just like more much only over should some than that their them there these they this those travel traveler trip trips very want what when where will with would your'.split(
    ' ',
  ),
);

/** Lowercase words of 4+ letters, plural "s" dropped, stopwords out. */
function significantWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !MATCH_STOPWORDS.has(w))
      .map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w)),
  );
}

/**
 * The taste line sharing the most significant words with the item (ties to the earlier line),
 * or null when none shares a word, so a reason never quotes a line the item has nothing to do with.
 * ponytail: plain word overlap; the live AI task does the real matching.
 */
export function bestPromoteLine(text: string, lines: readonly string[]): string | null {
  const words = significantWords(text);
  let best: string | null = null;
  let bestHits = 0;
  for (const line of lines) {
    let hits = 0;
    for (const w of significantWords(line)) if (words.has(w)) hits++;
    if (hits > bestHits) {
      best = line;
      bestHits = hits;
    }
  }
  return best;
}

/**
 * The AI fields seed.ts writes onto the row (05 section 9: prefilled so P0 works with no key).
 * Fit follows Mira's taste profile: on-taste work scores high, spam scores near zero.
 */
function aiFor(
  rng: Rng,
  bank: CommunityBank,
  text: { title: string; body: string },
  kind: { category: string; spam?: boolean; warm?: boolean },
): SeedAiFields {
  if (kind.spam) {
    return {
      summary: 'Unsolicited growth, giveaway or paid-review offer; the usual template.',
      category: kind.category,
      fitScore: rng.int(0, 8),
      fitReason:
        'Named in "never": bought followers, giveaways, presales and paid reviews. Nothing here matches what Mira promotes.',
      tags: ['spam', 'unsolicited'],
      skills: [],
      isSpam: true,
    };
  }
  const fitScore = kind.warm ? rng.int(18, 44) : rng.int(46, 94);
  const line = bestPromoteLine(`${text.title} ${text.body}`, PROMOTE_LINES);
  const reason = kind.warm
    ? 'Warm note with no ask. Nothing to act on, worth reading.'
    : line
      ? `Matches "${line}". ${rng.pick(SECOND_SENTENCES)}`
      : 'Fits your style.';
  return {
    summary: text.title.slice(0, LIMITS.ai.summaryMax),
    category: kind.category,
    fitScore,
    fitReason: reason.slice(0, LIMITS.ai.fitReasonMax),
    tags: rng.sample(bank.tags, rng.int(2, Math.min(4, LIMITS.ai.tagsMax))),
    skills: rng.sample(bank.skills, rng.int(1, Math.min(3, LIMITS.ai.skillsMax))),
    isSpam: false,
  };
}

/** Picks a community by weight, so Budget Travel and Solo Travelers carry most of the content. */
function weightedCommunity(rng: Rng): CommunityBank {
  const total = COMMUNITIES.reduce((sum, c) => sum + c.weight, 0);
  let roll = rng.float() * total;
  for (const community of COMMUNITIES) {
    roll -= community.weight;
    if (roll <= 0) return community;
  }
  return COMMUNITIES[0] as CommunityBank;
}

const bankFor = (slug: string): CommunityBank => {
  const bank = COMMUNITIES.find((c) => c.slug === slug);
  if (!bank) throw new Error(`unknown community "${slug}"`);
  return bank;
};

// ---------------------------------------------------------------- hand-written stories

/** "Lisbon on $60 a day": the hero story. Four roles filled, the most signals in the room. */
const LISBON = {
  title: 'Lisbon on $60 a day',
  body: 'Seven days in Lisbon for $420 all in, built by fans in Budget Travel. A local guide checks every price against what a local actually pays, a photographer shoots the golden-hour spots, an editor cuts it into a 12-minute guide and a planner lays it out day by day. A hostel bed is $24, a 24-hour tram pass $7.50, a pastel de nata at the counter about $1.50, and one fado night at a small tasca $16. Every price has a date next to it, so the guide stays honest.',
  roles: ['Local guide', 'Photographer', 'Video editor', 'Itinerary planner'],
} as const;

/** The second featured collab, in Food Finds. */
const OAXACA = {
  title: 'Ten family kitchens in Oaxaca',
  body: 'A fan-made food guide to ten family-run kitchens in Oaxaca, with the one dish to order at each, the price in pesos and dollars, and a photo taken that day. A local guide checks every address, a translator writes the menu cards and a photographer shoots the plates in daylight. Most meals are $4 to $9. The goal is a guide you can follow on foot in four days.',
  roles: ['Local guide', 'Translator', 'Photographer'],
} as const;

interface EntryDraft {
  title: string;
  body: string;
  daysAgo: number;
  /** Fixed author (the demo fan); otherwise drawn from the community. */
  authorIndex?: number;
}

/** Open challenge in Food Finds: six entries, none shortlisted yet. */
const FOOD_CHALLENGE = {
  community: 'food-finds',
  title: 'Best $10 meal in your city',
  body: 'Show me the best meal you can get for ten dollars or less in your city. Tell me what it is, where it is, what it cost and why a stranger should walk there. I will shortlist three and give the winner my spotlight.',
  createdDaysAgo: 9,
  dueInDays: 5,
  entries: [
    {
      authorIndex: 0,
      daysAgo: 8,
      title: 'Brisket tacos and a horchata from a trailer in East Austin, $9.75',
      body: 'Two brisket tacos, a scoop of rice and a horchata for $9.75, from a trailer that parks outside a laundromat. The line moves fast, the tortillas are made that morning and the salsa verde is worth asking for twice. Go before 1pm or the brisket is gone.',
    },
    {
      daysAgo: 7,
      title: 'A bowl of pho and a Vietnamese iced coffee in Houston, $9.50',
      body: 'A family counter on the edge of Midtown. The broth simmers overnight and the owner’s mother still tastes every pot. A small bowl is $7.25 and the iced coffee is $2.25. Cash only, so bring ten dollars.',
    },
    {
      daysAgo: 6,
      title: 'A plate lunch at a Hawaiian counter in Honolulu, $10',
      body: 'Two scoops of rice, mac salad and kalua pork for $10 flat, from a counter that has been open since 1974. Eat it standing at the window like everyone else. The portion is built for a construction crew, so I had half of it for dinner.',
    },
    {
      daysAgo: 4,
      title: 'Jollof rice with fried plantain in Atlanta, $8',
      body: 'A tiny Nigerian kitchen inside a grocery store. The jollof has that smoky edge from the pot and the plantain comes out hot. $8 with a drink. The owner asks where you are from and then sits you next to someone who is from there.',
    },
    {
      daysAgo: 3,
      title: 'Hand-pulled noodles in Flushing, $8.50',
      body: 'You watch the noodles being pulled behind the glass, then you eat them ten minutes later in a chili-oil broth. $8.50, no tip culture, and the lunch rush is gone by 1:30. Ask for them wide.',
    },
    {
      daysAgo: 1,
      title: 'Comida corrida in Mexico City, about $5',
      body: 'Four courses for 90 pesos, about $5: soup, rice, a main of the day and a jug of agua fresca. It is in a back room behind a pharmacy and there is no sign. Ask any taxi driver for "la comida corrida de la esquina".',
    },
  ] as readonly EntryDraft[],
};

/** Closed challenge in Travel Photography: five entries, a stored shortlist and a winner. */
const PHOTO_CHALLENGE = {
  community: 'travel-photography',
  title: 'Your best golden-hour frame',
  body: 'Share the one golden-hour photo from your travels that you are proudest of. Tell me where you stood, what time it was and what phone or camera you used. I will shortlist three and give the winner my spotlight.',
  createdDaysAgo: 26,
  dueInDays: -12,
  entries: [
    {
      daysAgo: 24,
      title: 'Alfama rooftops at 7:42pm, phone only',
      body: 'Shot on a four-year-old phone from a viewpoint above Alfama, ten minutes before sunset. I stood on the wall to the left of the crowd so the tram lines lead into the frame. No edit except lifting the shadows a little.',
    },
    {
      daysAgo: 22,
      title: 'Fog lifting off the Douro, 6:50am',
      body: 'Porto, from the upper deck of the big iron bridge, tripod on the railing. I arrived at 6:15 and had the whole bridge to myself for forty minutes. The light came through just once.',
    },
    {
      daysAgo: 20,
      title: 'Last light on a fisherman’s hands, Nazaré',
      body: 'I asked first, he nodded, and I took four frames while he mended a net. The light came in low from the right. I sent him the photo afterwards through his niece.',
    },
    {
      daysAgo: 17,
      title: 'A rooftop in Fes at golden hour',
      body: 'Fes, Morocco, from a rooftop café that charges nothing if you buy a mint tea (30 dirhams). The call to prayer started right as the sun dropped behind the medina. I kept the exposure low so the sky stayed orange.',
    },
    {
      daysAgo: 15,
      title: 'Salt flats at 5:30pm, Bolivia',
      body: 'Uyuni in the wet season. The ground turns into a mirror and the sky doubles. I kept the horizon dead centre and waited for the jeep to move out of the shot. Shot on a phone with the screen brightness turned down.',
    },
  ] as readonly EntryDraft[],
  /** Entry indices (within `entries`) and Mira's AI-drafted reasons. */
  shortlist: [
    {
      entry: 1,
      reason:
        'Strong match: it names the time, the spot and how long you waited, which a beginner can copy.',
    },
    {
      entry: 2,
      reason:
        'Strong match: the photographer asked first and sent the photo back, which is how Mira wants fans to shoot people.',
    },
    {
      entry: 4,
      reason:
        'Worth a look: a phone photo with the exact trick (screen low, wait for the jeep) written down.',
    },
  ] as const,
  winnerEntry: 2,
};

// ---------------------------------------------------------------- the data

export function buildData(seed: number = SEED): SeedData {
  const rng = new Rng(seed);

  const communities: SeedCommunity[] = COMMUNITIES.map((bank) => ({
    slug: bank.slug,
    name: bank.name,
    description: bank.description,
    tint: bank.tint,
    icon: bank.icon,
  }));

  // ---- members. Index 0 is the demo fan, so "Enter as fan" always lands on a real profile.
  const members: SeedMember[] = [
    {
      name: DEMO_FAN.name,
      email: DEMO_FAN.email,
      headline: DEMO_FAN.headline,
      intro: DEMO_FAN.intro,
      skills: [...DEMO_FAN.skills],
      links: [{ label: 'Instagram', url: 'https://instagram.com/priyashah.eats' }],
      communities: [...DEMO_FAN.communities],
      joinedDaysAgo: 61,
      isDemoFan: true,
    },
  ];

  const usedEmails = new Set<string>([DEMO_FAN.email]);
  while (members.length < TARGETS.members) {
    const first = rng.pick(FIRST_NAMES);
    const last = rng.pick(LAST_NAMES);
    const index = members.length;
    // Emails must be unique: the index keeps them so without making names unique.
    const local = `${first}.${last}${index}`.toLowerCase().replace(/[^a-z0-9.]/g, '');
    const email = `${local}@example.com`;
    if (usedEmails.has(email)) continue;
    usedEmails.add(email);

    const profile = rng.pick(PROFILES);
    // Most fans join one or two rooms; a few join four.
    const joinCount = rng.chance(0.08) ? rng.int(3, 4) : rng.int(1, 2);
    const joined = new Set<string>();
    for (let i = 0; i < joinCount; i += 1) joined.add(weightedCommunity(rng).slug);

    // Joins cluster towards recent weeks, so the trend lines rise rather than sit flat.
    const joinedDaysAgo = Math.min(JOIN_WINDOW_DAYS, rng.skewed(JOIN_WINDOW_DAYS));
    const hasIntro = rng.chance(0.55);

    members.push({
      name: `${first} ${last}`,
      email,
      headline: rng.chance(0.82) ? profile.headline : null,
      intro: hasIntro
        ? `${rng.pick(INTRO_OPENERS)} ${rng.pick(INTRO_WANTS)}.`.slice(
            0,
            LIMITS.membership.intro.max,
          )
        : null,
      skills: rng.chance(0.78) ? rng.sample(profile.skills, rng.int(2, profile.skills.length)) : [],
      links: rng.chance(0.18)
        ? [{ label: 'Instagram', url: `https://instagram.com/${first}.${last}`.toLowerCase() }]
        : [],
      communities: [...joined],
      joinedDaysAgo,
    });
  }

  /** Member indices that joined `slug`, for picking authors and signallers who belong there. */
  const membersBySlug = new Map<string, number[]>();
  for (const community of communities) membersBySlug.set(community.slug, []);
  for (const [i, member] of members.entries()) {
    for (const slug of member.communities) membersBySlug.get(slug)?.push(i);
  }

  const poolOf = (slug: string, exclude: readonly number[] = []): number[] =>
    (membersBySlug.get(slug) ?? []).filter((i) => i !== 0 && !exclude.includes(i));

  const persona = (index: number, headline: string, skills: string[]) => {
    const member = members[index];
    if (member) {
      member.headline = headline;
      member.skills = skills;
    }
  };

  // ---- posts. Hand-written stories first, so the rest of the feed is drawn around them.
  const posts: SeedPost[] = [];
  const usedTitles = new Set<string>([LISBON.title, OAXACA.title]);
  /** Posts the demo-fan reshuffling below must leave alone. */
  const fixed = new Set<SeedPost>();

  // Lisbon on $60 a day: written by the demo fan (index 0, the planner), plus three accepted crew whose
  // names and roles match the landing story (web/components/landing/loop-data.ts).
  const lisbonBank = bankFor('budget-travel');
  const lisbonCrew = rng.sample(poolOf('budget-travel'), 3);
  const [lisbonGuide, lisbonPhotographer, lisbonEditor] = lisbonCrew as [number, number, number];
  const crewMember = (index: number, name: string, headline: string, skills: string[]) => {
    members[index]!.name = name;
    persona(index, headline, skills);
  };
  crewMember(lisbonGuide, 'Inês Duarte', 'Local guide, walking tours in three languages', [
    'local knowledge',
    'walking tours',
    'translation',
  ]);
  crewMember(lisbonPhotographer, 'Marcus Reed', 'Photographer, golden-hour obsessed', [
    'photography',
    'lightroom',
  ]);
  crewMember(lisbonEditor, 'Dani Okafor', 'Video editor, short form', [
    'premiere',
    'editing',
    'motion',
  ]);
  members[lisbonGuide]!.joinedDaysAgo = Math.min(members[lisbonGuide]!.joinedDaysAgo, 50);
  const lisbonCandidates = poolOf('budget-travel', lisbonCrew);
  const lisbonUse = rng.sample(lisbonCandidates, 212);
  const lisbonBuild = rng.sample(
    lisbonCandidates.filter((i) => !lisbonUse.includes(i)),
    38,
  );
  const lisbon: SeedPost = {
    community: 'budget-travel',
    authorIndex: 0,
    type: 'project',
    title: LISBON.title,
    body: LISBON.body,
    status: 'launched',
    rolesNeeded: [...LISBON.roles],
    links: [{ label: 'The fan guide', url: 'https://example.com/lisbon-on-60-a-day' }],
    createdDaysAgo: 40,
    lovedDaysAgo: 3,
    signals: { use: lisbonUse, build: lisbonBuild },
    team: [
      { memberIndex: lisbonGuide, role: 'Local guide', status: 'accepted' },
      { memberIndex: lisbonPhotographer, role: 'Photographer', status: 'accepted' },
      { memberIndex: lisbonEditor, role: 'Video editor', status: 'accepted' },
      { memberIndex: 0, role: 'Itinerary planner', status: 'accepted' },
    ],
    ai: {
      ...aiFor(
        rng,
        lisbonBank,
        { title: LISBON.title, body: LISBON.body },
        { category: 'project' },
      ),
      fitScore: 97,
      fitReason:
        'Matches "budget-honest travel, with real prices and the receipts". Four roles filled, every price dated and checked by a local.',
    },
  };
  posts.push(lisbon);
  fixed.add(lisbon);

  // Ten family kitchens in Oaxaca: the second featured collab. The demo fan is its photographer.
  const oaxacaBank = bankFor('food-finds');
  const oaxacaCrew = rng.sample(poolOf('food-finds'), 3);
  const [oaxacaLead, oaxacaGuide, oaxacaTranslator] = oaxacaCrew as [number, number, number];
  persona(oaxacaLead, 'Food writer, mostly street food', [
    'food writing',
    'photography',
    'cooking',
  ]);
  persona(oaxacaGuide, 'Hostel host in Mexico City', ['hosting', 'local knowledge', 'spanish']);
  persona(oaxacaTranslator, 'Translator, Spanish and Portuguese', [
    'translation',
    'spanish',
    'portuguese',
  ]);
  const oaxacaCandidates = poolOf('food-finds', oaxacaCrew);
  const oaxacaUse = rng.sample(oaxacaCandidates, 40);
  const oaxaca: SeedPost = {
    community: 'food-finds',
    authorIndex: oaxacaLead,
    type: 'project',
    title: OAXACA.title,
    body: OAXACA.body,
    status: 'launched',
    rolesNeeded: [...OAXACA.roles],
    links: [],
    createdDaysAgo: 33,
    lovedDaysAgo: 20,
    signals: {
      use: oaxacaUse,
      build: rng.sample(
        oaxacaCandidates.filter((i) => !oaxacaUse.includes(i)),
        14,
      ),
    },
    team: [
      { memberIndex: oaxacaGuide, role: 'Local guide', status: 'accepted' },
      { memberIndex: oaxacaTranslator, role: 'Translator', status: 'accepted' },
      { memberIndex: 0, role: 'Photographer', status: 'accepted' },
    ],
    ai: {
      ...aiFor(
        rng,
        oaxacaBank,
        { title: OAXACA.title, body: OAXACA.body },
        { category: 'project' },
      ),
      fitScore: 91,
      fitReason:
        'Matches "small family-run food spots over famous restaurants". Three roles filled and every address checked by a local.',
    },
  };
  posts.push(oaxaca);
  fixed.add(oaxaca);

  // Challenge entries: ordinary idea posts linked to their challenge (posts.ask_id).
  const challengeSpecs = [FOOD_CHALLENGE, PHOTO_CHALLENGE] as const;
  const entryPosts: SeedPost[][] = challengeSpecs.map((spec, challengeIndex) => {
    const bank = bankFor(spec.community);
    const pool = poolOf(spec.community);
    return spec.entries.map((entry) => {
      usedTitles.add(entry.title);
      const authorIndex = entry.authorIndex ?? rng.pick(pool);
      const candidates = pool.filter((i) => i !== authorIndex);
      const post: SeedPost = {
        community: spec.community,
        authorIndex,
        type: 'idea',
        title: entry.title,
        body: entry.body,
        status: 'open',
        rolesNeeded: [],
        links: [],
        createdDaysAgo: entry.daysAgo,
        challenge: challengeIndex,
        signals: { use: rng.sample(candidates, rng.int(3, 22)), build: [] },
        team: [],
        ai: aiFor(rng, bank, { title: entry.title, body: entry.body }, { category: 'idea' }),
      };
      posts.push(post);
      fixed.add(post);
      return post;
    });
  });

  while (posts.length < TARGETS.posts) {
    const bank = weightedCommunity(rng);
    const pool = membersBySlug.get(bank.slug) ?? [];
    if (pool.length === 0) continue;

    const idea = rng.pick(bank.ideas);
    const text = title(rng, bank, idea);
    if (usedTitles.has(text)) continue;
    usedTitles.add(text);

    const type = rng.chance(0.3) ? 'project' : rng.chance(0.78) ? 'idea' : 'discussion';
    const authorIndex = rng.pick(pool);
    const createdDaysAgo = Math.min(JOIN_WINDOW_DAYS, rng.skewed(JOIN_WINDOW_DAYS));
    const prose = body(rng, bank, idea, type !== 'discussion');

    // Signals come from fans of the same room, never the author.
    const candidates = pool.filter((i) => i !== authorIndex);
    const use = rng.sample(candidates, Math.min(candidates.length, rng.skewed(26)));
    const build = rng.sample(
      candidates.filter((i) => !use.includes(i)),
      Math.min(candidates.length, rng.skewed(9)),
    );

    const roles = type === 'project' ? rng.sample(bank.roles, rng.int(1, 3)) : [];
    const team =
      type === 'project'
        ? rng
            .sample(candidates, Math.min(candidates.length, rng.int(1, 4)))
            .map((memberIndex, i) => ({
              memberIndex,
              role: (roles[i % Math.max(1, roles.length)] ?? 'Collaborator') as string,
              status: (rng.chance(0.68)
                ? 'accepted'
                : rng.chance(0.7)
                  ? 'requested'
                  : 'declined') as 'accepted' | 'requested' | 'declined',
            }))
        : [];

    // Only projects move past `open`, and a project that has nobody yet cannot be in the works.
    // The weights spread the projects across all four columns of the Ideas board, which is
    // what that screen is for: a board with everything in one column shows nothing.
    const accepted = team.filter((t) => t.status === 'accepted').length;
    const status =
      type !== 'project'
        ? 'open'
        : accepted === 0
          ? rng.pick(['open', 'open', 'forming_team'] as const)
          : rng.pick([
              'open',
              'forming_team',
              'forming_team',
              'building',
              'building',
              'launched',
            ] as const);

    posts.push({
      community: bank.slug,
      authorIndex,
      type,
      title: text,
      body: prose,
      status,
      rolesNeeded: roles,
      links: rng.chance(0.22) ? [{ label: 'Notes', url: 'https://example.com/notes' }] : [],
      createdDaysAgo,
      signals: { use, build },
      team,
      ai: aiFor(rng, bank, { title: text, body: prose }, { category: type }),
    });
  }
  // Newest last is confusing to read in a diff; keep the file oldest-first.
  posts.sort((a, b) => b.createdDaysAgo - a.createdDaysAgo);

  // The demo fan signs in to /{handle}/me, which lists their posts, teams and pitches
  // (03-app-flow J7). Random assignment leaves that page nearly empty on the one account every
  // reviewer logs into, so give index 0 a guaranteed share of what is already there.
  const fanRooms = new Set<string>(DEMO_FAN.communities);
  const fanPosts = posts
    .map((post, index) => ({ post, index }))
    .filter(
      (entry) =>
        fanRooms.has(entry.post.community) &&
        entry.post.authorIndex !== 0 &&
        !fixed.has(entry.post),
    );

  // Two posts of their own, with the fan removed from their own signals and team.
  for (const { post } of fanPosts.slice(0, 2)) {
    post.authorIndex = 0;
    post.signals = {
      use: post.signals.use.filter((i) => i !== 0),
      build: post.signals.build.filter((i) => i !== 0),
    };
    post.team = post.team.filter((member) => member.memberIndex !== 0);
  }
  // The first of them is "Loved by Mira", so the fan side has a moment to show.
  const fanLoved = fanPosts[0]?.post;
  if (fanLoved) fanLoved.lovedDaysAgo = 5;

  // One accepted team seat on somebody else's project, so "My crews" has a row.
  const fanTeamPost = fanPosts.find(
    (entry) =>
      entry.post.type === 'project' &&
      entry.post.authorIndex !== 0 &&
      entry.post.team.every((member) => member.memberIndex !== 0),
  );
  if (fanTeamPost) {
    fanTeamPost.post.team.push({
      memberIndex: 0,
      role: fanTeamPost.post.rolesNeeded[0] ?? 'Local guide',
      status: 'accepted',
    });
    if (fanTeamPost.post.status === 'open') fanTeamPost.post.status = 'forming_team';
  }

  // A few signals, so the fan's own feed shows the buttons in their pressed state.
  for (const { post } of fanPosts.filter((entry) => entry.post.authorIndex !== 0).slice(2, 9)) {
    if (!post.signals.use.includes(0) && !post.signals.build.includes(0)) {
      (rng.chance(0.7) ? post.signals.use : post.signals.build).push(0);
    }
  }

  // ---- fan spotlight: three rising fans get a shout-out ("Fans of the week").
  const firstName = (index: number) => (members[index]?.name ?? 'This fan').split(' ')[0];
  const soloPool = poolOf('solo-travelers', [...lisbonCrew, ...oaxacaCrew]);
  const risingSolo = rng.pick(soloPool);
  members[risingSolo]!.joinedDaysAgo = Math.min(members[risingSolo]!.joinedDaysAgo, 21);
  persona(risingSolo, 'Runs the Sunday check-in thread', ['hosting', 'solo travel', 'safety']);
  members[lisbonGuide]!.spotlight = {
    daysAgo: 2,
    note: `${firstName(lisbonGuide)} checked every price in the Lisbon guide against what a local actually pays, then answered forty questions in the comments. Thank you for making Budget Travel feel like a table with a seat for everyone.`,
  };
  members[risingSolo]!.spotlight = {
    daysAgo: 4,
    note: `${firstName(risingSolo)} started the Sunday check-in thread for Solo Travelers and has quietly welcomed forty new people since March. Thank you for making the first night in a new city a little less lonely.`,
  };
  members[0]!.spotlight = {
    daysAgo: 6,
    note: 'Priya mapped eleven of her favorite Austin and Tokyo food spots for Food Finds, with prices and the one dish to order at each. Thank you for the generosity, and for the tacos.',
  };

  // ---- comments: weighted towards the posts that got signals, like a real feed.
  const comments: SeedComment[] = [];
  const commentWeights = posts.map((post, i) => ({
    index: i,
    weight: 1 + post.signals.use.length + post.signals.build.length * 2,
  }));
  const weightTotal = commentWeights.reduce((sum, w) => sum + w.weight, 0);
  while (comments.length < TARGETS.comments) {
    let roll = rng.float() * weightTotal;
    let postIndex = 0;
    for (const entry of commentWeights) {
      roll -= entry.weight;
      if (roll <= 0) {
        postIndex = entry.index;
        break;
      }
    }
    const post = posts[postIndex];
    if (!post) continue;
    const pool = (membersBySlug.get(post.community) ?? []).filter((i) => i !== post.authorIndex);
    if (pool.length === 0) continue;

    comments.push({
      postIndex,
      authorIndex: rng.pick(pool),
      body: `${rng.pick(COMMENT_OPENERS)}: ${rng.pick(COMMENT_BODIES)}`,
      // A comment is never older than the post it is on.
      createdDaysAgo: Math.max(
        0,
        post.createdDaysAgo - rng.int(0, Math.max(1, post.createdDaysAgo)),
      ),
    });
  }
  comments.sort((a, b) => b.createdDaysAgo - a.createdDaysAgo);

  // ---- pitches: the inbox, with the noise described in 05 section 9.
  const pitches: SeedPitch[] = [];
  const pitchTotal = PITCHES.reduce((sum, bank) => sum + bank.weight, 0);
  while (pitches.length < TARGETS.pitches) {
    let roll = rng.float() * pitchTotal;
    let bank = PITCHES[0] as PitchBank;
    for (const candidate of PITCHES) {
      roll -= candidate.weight;
      if (roll <= 0) {
        bank = candidate;
        break;
      }
    }

    const senderIndex = rng.int(0, members.length - 1);
    const message = rng.pick(bank.messages);
    const subject = message.subject;
    const prose = message.body;
    const createdDaysAgo = Math.min(JOIN_WINDOW_DAYS, rng.skewed(JOIN_WINDOW_DAYS));
    const warm = bank.type === 'fan_note';
    const ai = aiFor(
      rng,
      weightedCommunity(rng),
      { title: subject, body: prose },
      { category: bank.type, spam: bank.spam, warm },
    );

    // Older pitches have mostly been dealt with; recent ones are still new.
    const status = bank.spam
      ? 'new'
      : createdDaysAgo < 4
        ? 'new'
        : rng.chance(0.3)
          ? 'replied'
          : rng.chance(0.4)
            ? 'shortlisted'
            : rng.chance(0.5)
              ? 'archived'
              : 'new';

    pitches.push({
      senderIndex,
      type: bank.type,
      subject,
      body: prose,
      links:
        !bank.spam && rng.chance(0.3)
          ? [{ label: 'Our work', url: 'https://example.com/work' }]
          : [],
      status,
      isFiltered: Boolean(bank.spam),
      creatorReply: status === 'replied' ? rng.pick(REPLIES[bank.type]) : null,
      createdDaysAgo,
      ai,
    });
  }

  // Two ideas from the demo fan, one of them answered: J7 ends with the fan reading Mira's
  // reply in /{handle}/me, so that reply has to exist before anyone opens the demo. Written by
  // hand (not drawn from the banks) so the reply answers what she actually asked.
  const fanPitchSlots = pitches.filter((pitch) => !pitch.isFiltered).slice(0, 2);
  const fanPitchBank = bankFor('food-finds');
  const fanPitchTexts = [
    {
      type: 'idea' as const,
      subject: 'A Tokyo food map for people on $30 a day',
      body: 'I am in Food Finds and I keep seeing the same request: nobody has made a proper Tokyo food map for people on $30 a day. I have eleven places from my trip in March, with prices and the one dish to order. Would you feature it if the fans filled it in?',
      status: 'replied' as const,
      creatorReply:
        'I love this, Priya. Yes: start the Tokyo map in Food Finds and invite people to add their places. When it has twenty, send it back to me and I will feature it with your name on it.',
      createdDaysAgo: 12,
    },
    {
      type: 'collab' as const,
      subject: 'An Austin meetup for Solo Travelers',
      body: 'I would like to host a small Solo Travelers meetup in Austin this fall: one table, a taco trailer, ten people who have all been the one eating alone. I can book the spot and write the invite. Would you send a note to the room?',
      status: 'shortlisted' as const,
      creatorReply: null,
      createdDaysAgo: 5,
    },
  ];
  for (const [i, pitch] of fanPitchSlots.entries()) {
    const text = fanPitchTexts[i];
    if (!text) continue;
    pitch.senderIndex = 0;
    pitch.type = text.type;
    pitch.subject = text.subject;
    pitch.body = text.body;
    pitch.links = [];
    pitch.status = text.status;
    pitch.creatorReply = text.creatorReply;
    pitch.createdDaysAgo = text.createdDaysAgo;
    pitch.ai = aiFor(
      rng,
      fanPitchBank,
      { title: text.subject, body: text.body },
      { category: text.type },
    );
  }
  pitches.sort((a, b) => b.createdDaysAgo - a.createdDaysAgo);

  // ---- promotions: the two featured collabs, with click history (05 section 9).
  const promotable = [lisbon, oaxaca].map((post) => ({ post, index: posts.indexOf(post) }));
  const clickWeights = { x: 3, instagram: 12, linkedin: 1, youtube: 10, other: 2 } as const;

  const promotions: SeedPromotion[] = promotable.map((entry, i) => {
    const publishedDaysAgo = i === 0 ? rng.int(8, 10) : rng.int(5, 7);
    const slugBase = entry.post.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 36)
      .replace(/-+$/, '');
    const clicks: SeedPromotion['clicks'] = [];
    for (let day = publishedDaysAgo; day >= 0; day -= 1) {
      for (const platform of ['x', 'instagram', 'linkedin', 'youtube', 'other'] as const) {
        // Launch day gets the spike, then it tails off.
        const peak = day === publishedDaysAgo ? 3 : 1;
        const count = rng.skewed(clickWeights[platform] * peak);
        if (count > 0) clicks.push({ platform, daysAgo: day, count });
      }
    }
    const drafts =
      i === 0
        ? {
            x: {
              text: 'Lisbon on $60 a day, made by my fans: a local guide, a photographer, an editor and a planner. Every price checked, every spot real. The whole guide is below.',
              hashtags: ['LisbonTravel', 'BudgetTravel'],
            },
            instagram: {
              text: 'Lisbon on $60 a day, made by fans in Budget Travel.\n\nA local guide checked every price. A photographer found the golden-hour spots. An editor cut it into twelve minutes and a planner laid out each day. Link in bio.',
              hashtags: ['LisbonTravel', 'BudgetTravel', 'FanMade'],
            },
            youtube: {
              text: 'Lisbon on $60 a day: the fan-made guide. Built in Budget Travel by four people who had never met. Every price is dated and checked by a local. Credits and the full guide are in the link below.',
              hashtags: [],
            },
          }
        : {
            x: {
              text: 'Ten family kitchens in Oaxaca, found and checked by my Food Finds fans. One dish to order at each, the price in pesos and dollars, and a photo from that day. Guide below.',
              hashtags: ['OaxacaFood', 'FoodFinds'],
            },
            instagram: {
              text: 'Ten family kitchens in Oaxaca, made by fans in Food Finds.\n\nA local guide checked every address, a translator wrote the menu cards and a photographer shot the plates in daylight. Most meals are $4 to $9. Link in bio.',
              hashtags: ['OaxacaFood', 'FoodFinds', 'FanMade'],
            },
            youtube: {
              text: 'Ten family kitchens in Oaxaca, a fan-made guide from our Food Finds room. Every address checked by a local. Credits and the full guide are in the link below.',
              hashtags: [],
            },
          };
    return {
      postIndex: entry.index,
      headline: `Featured: ${entry.post.title}`.slice(0, LIMITS.promotion.headline.max),
      drafts,
      showcaseSlug: slugBase || `featured-project-${i + 1}`,
      // Fixed codes keep the committed file stable; they only need to be unique.
      shortCode: i === 0 ? 'Mk7Qd2Lp' : 'Rb4Xs9Tn',
      publishedDaysAgo,
      clicks,
    };
  });

  // ---- challenges: one open in Food Finds, one closed in Travel Photography (shortlist + winner).
  const postIndexOf = (post: SeedPost | undefined): number => {
    const index = post ? posts.indexOf(post) : -1;
    if (index < 0) throw new Error('challenge entry is missing from posts');
    return index;
  };
  const challenges: SeedChallenge[] = challengeSpecs.map((spec, challengeIndex) => {
    const entries = entryPosts[challengeIndex] ?? [];
    const shortlist = 'shortlist' in spec ? spec.shortlist : null;
    const winnerEntry = 'winnerEntry' in spec ? spec.winnerEntry : null;
    return {
      community: spec.community,
      title: spec.title,
      body: spec.body,
      createdDaysAgo: spec.createdDaysAgo,
      dueInDays: spec.dueInDays,
      status: shortlist ? 'closed' : 'open',
      shortlist: shortlist
        ? shortlist.map(({ entry, reason }) => ({ postIndex: postIndexOf(entries[entry]), reason }))
        : null,
      winnerPostIndex: winnerEntry === null ? null : postIndexOf(entries[winnerEntry]),
    };
  });

  return { space: SPACE, communities, members, posts, comments, pitches, promotions, challenges };
}

// ---------------------------------------------------------------- writing

const dataDir = new URL('./data/', import.meta.url);

/** One file per key, pretty-printed with a trailing newline so diffs stay line-based. */
export async function writeData(data: SeedData): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const files: Array<[string, unknown]> = [
    ['space', data.space],
    ['communities', data.communities],
    ['members', data.members],
    ['posts', data.posts],
    ['comments', data.comments],
    ['pitches', data.pitches],
    ['promotions', data.promotions],
    ['challenges', data.challenges ?? []],
  ];
  for (const [name, value] of files) {
    await writeFile(
      new URL(`${name}.json`, dataDir),
      `${JSON.stringify(value, null, 2)}\n`,
      'utf8',
    );
  }
}

function summarize(data: SeedData): string {
  const signals = data.posts.reduce((n, p) => n + p.signals.use.length + p.signals.build.length, 0);
  const clicks = data.promotions.reduce((n, p) => n + p.clicks.reduce((m, c) => m + c.count, 0), 0);
  const spam = data.pitches.filter((p) => p.isFiltered).length;
  return [
    `${data.communities.length} communities`,
    `${data.members.length} members`,
    `${data.posts.length} posts`,
    `${data.comments.length} comments`,
    `${signals} signals`,
    `${data.pitches.length} pitches (${spam} filtered)`,
    `${data.promotions.length} promotions`,
    `${clicks} clicks`,
    `${data.challenges?.length ?? 0} challenges`,
  ].join(', ');
}

async function main(): Promise<void> {
  const check = process.argv.includes('--check');
  const data = buildData();
  console.info(`[generate-content] ${summarize(data)}`);
  if (check) {
    console.info('[generate-content] --check: nothing written');
    return;
  }
  await writeData(data);
  console.info('[generate-content] wrote src/db/seed/data/*.json');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
