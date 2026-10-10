import {
  COMMUNITY_ICONS,
  type CommunityIcon,
  type createSpaceSchema,
  handleSchema,
  LIMITS,
  LOOKUP_PLATFORMS,
  type LookupPlatform,
  type OnboardingCommunityInput,
  PLATFORMS,
  type Platform,
  type PlatformProfile,
  platformProfileSchema,
  type SetupSuggestions,
  type Tint,
} from '@fellow-owners/shared';
import {
  Backpack,
  BookOpen,
  Camera,
  Car,
  ChartLine,
  Code2,
  Dumbbell,
  Gamepad2,
  Globe,
  Heart,
  Leaf,
  type LucideIcon,
  Mic,
  Music,
  Palette,
  PenTool,
  Rocket,
  Sunrise,
  Users,
  Utensils,
  Wallet,
} from 'lucide-react';
import type { z } from 'zod';

// Data, types and pure helpers for /onboarding ("Create your space", 03-app-flow §2).

/** The host fans see in the bio link. */
export const HOST = (() => {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (url && !url.includes('localhost')) {
    try {
      return new URL(url).host;
    } catch {
      // fall through
    }
  }
  return 'fellowowners.app';
})();

// ---------------------------------------------------------------- steps

export const STEPS = [
  {
    key: 'handle',
    label: 'Handle',
    title: 'Claim your link',
    helper:
      'This is the link for your bio, like fellowowners.app/yourname. Fans see your name and one line about you.',
  },
  {
    key: 'platforms',
    label: 'Platforms',
    title: 'Where your audience is',
    helper: 'Optional. Follower counts show on your page, and you can change them later.',
  },
  {
    key: 'communities',
    label: 'Communities',
    title: 'Pick your communities',
    helper: 'Fans join by interest. Start with at least one; you can rename or add more later.',
  },
  {
    key: 'taste',
    label: 'What you love',
    title: 'Tell us what you love',
    helper:
      'Your assistant uses this to see how well each idea and brand deal fits you, and to write replies in your voice. Fans never see it.',
  },
] as const;

export type StepIndex = 0 | 1 | 2 | 3;
export const LAST_STEP: StepIndex = 3;

// ---------------------------------------------------------------- form shape

/** A community as it lives in the form. `templateId` ties it to a template tile and is stripped by zod. */
export type CommunityDraft = OnboardingCommunityInput & {
  description?: string;
  templateId?: string;
};

export interface PlatformDraft {
  platform: Platform;
  url: string;
  /** NaN while the field is blank or unreadable; zod reports "Enter a number". */
  followers: number;
  /** Set when the row came from a profile lookup ("Use this"); the daily refresh uses them. */
  handle?: string;
  fetchedAt?: string;
}

/** createSpaceSchema's input, with the few looser shapes the form needs while typing. */
export interface OnboardingValues {
  handle: string;
  displayName: string;
  bio: string;
  /** Only from an imported profile: a data: URL or a /demo/ path. Undefined means initials. */
  avatarUrl?: string;
  platforms: PlatformDraft[];
  communities: CommunityDraft[];
  tasteProfile: { promote: string[]; never: string[]; voice: string[] };
}

export type OnboardingOutput = z.output<typeof createSpaceSchema>;

export function emptyPlatform(taken: Platform[] = []): PlatformDraft {
  const next = PLATFORMS.find((p) => p !== 'other' && !taken.includes(p)) ?? 'other';
  return { platform: next, url: '', followers: Number.NaN };
}

export const DEFAULT_VALUES: OnboardingValues = {
  handle: '',
  displayName: '',
  bio: '',
  platforms: [emptyPlatform()],
  communities: [],
  tasteProfile: { promote: [''], never: [''], voice: [''] },
};

/** Which form paths each step validates on Continue. */
export const STEP_FIELDS = [
  ['handle', 'displayName', 'bio'],
  ['platforms', 'avatarUrl'],
  ['communities'],
  ['tasteProfile.promote', 'tasteProfile.never', 'tasteProfile.voice'],
] as const;

/** Maps an error path from the API or zod to the step that owns it. */
export function stepForPath(path: string): StepIndex {
  if (path.startsWith('platforms') || path === 'avatarUrl') return 1;
  if (path.startsWith('communities')) return 2;
  if (path.startsWith('tasteProfile')) return 3;
  return 0;
}

// ---------------------------------------------------------------- handle

export type HandleStatus =
  | { state: 'idle' }
  | { state: 'invalid'; message: string }
  | { state: 'checking'; handle: string }
  | { state: 'available'; handle: string }
  | { state: 'taken'; handle: string; reason: 'taken' | 'reserved'; suggestions: string[] }
  | { state: 'unavailable'; handle: string };

/** Lowercases as typed, drops spaces and a pasted leading "@" or "/". Other characters stay so the hint can explain them. */
export function normalizeHandleInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/^[@/]+/, '');
}

/**
 * A first handle for someone with no username yet (Google, Apple or Facebook sign-up): their name run
 * together, "Priya Shah" to "priyashah". Null when that would not be a valid handle.
 */
export function handleFromName(name: string): string | null {
  const joined = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, LIMITS.handle.max);
  return handleSchema.safeParse(joined).success ? joined : null;
}

// ---------------------------------------------------------------- tints and icons

export const TINT_LABELS: Record<Tint, string> = {
  peach: 'Apricot',
  lavender: 'Lavender',
  aqua: 'Aqua',
  lime: 'Lime',
  white: 'White',
};

/** Card fill, icon tile fill and icon colour for each community tint (DESIGN.md community card). */
export const TINT_STYLES: Record<
  Tint,
  { card: string; tile: string; icon: string; swatch: string }
> = {
  peach: { card: 'bg-peach', tile: 'bg-peach-tile', icon: 'text-orange', swatch: 'bg-peach-tile' },
  lavender: {
    card: 'bg-lavender',
    tile: 'bg-lavender-tile',
    icon: 'text-purple-chart',
    swatch: 'bg-lavender-tile',
  },
  aqua: { card: 'bg-aqua', tile: 'bg-aqua-tile', icon: 'text-teal', swatch: 'bg-aqua-tile' },
  // Lime marks "you are here" and is never a surface (DESIGN.md): an older draft's lime reads as white.
  lime: {
    card: 'bg-card-strong',
    tile: 'bg-table-head',
    icon: 'text-ink',
    swatch: 'bg-card-strong',
  },
  white: {
    card: 'bg-card-strong',
    tile: 'bg-table-head',
    icon: 'text-ink',
    swatch: 'bg-card-strong',
  },
};

export const COMMUNITY_ICON_COMPONENTS: Record<CommunityIcon, LucideIcon> = {
  users: Users,
  'code-2': Code2,
  'pen-tool': PenTool,
  'line-chart': ChartLine,
  music: Music,
  dumbbell: Dumbbell,
  leaf: Leaf,
  camera: Camera,
  'gamepad-2': Gamepad2,
  'book-open': BookOpen,
  rocket: Rocket,
  heart: Heart,
  globe: Globe,
  mic: Mic,
  palette: Palette,
  utensils: Utensils,
  wallet: Wallet,
  backpack: Backpack,
  car: Car,
  sunrise: Sunrise,
};

export const COMMUNITY_ICON_LABELS: Record<CommunityIcon, string> = {
  users: 'People',
  'code-2': 'Code',
  'pen-tool': 'Pen',
  'line-chart': 'Chart',
  music: 'Music',
  dumbbell: 'Dumbbell',
  leaf: 'Leaf',
  camera: 'Camera',
  'gamepad-2': 'Game controller',
  'book-open': 'Book',
  rocket: 'Rocket',
  heart: 'Heart',
  globe: 'Globe',
  mic: 'Microphone',
  palette: 'Palette',
  utensils: 'Food',
  wallet: 'Wallet',
  backpack: 'Backpack',
  car: 'Car',
  sunrise: 'Sunrise',
};

export const ICON_OPTIONS = COMMUNITY_ICONS;

// ---------------------------------------------------------------- community templates

export interface CommunityTemplate {
  id: string;
  name: string;
  description: string;
  tint: Tint;
  icon: CommunityIcon;
}

const t = (
  id: string,
  name: string,
  description: string,
  tint: Tint,
  icon: CommunityIcon,
): CommunityTemplate => ({
  id,
  name,
  description,
  tint,
  icon,
});

export interface CommunityPreset {
  id: string;
  label: string;
  templates: CommunityTemplate[];
}

/** Starting points by kind of creator. Travel is the default; each offers 5-6 communities. */
export const COMMUNITY_PRESETS: CommunityPreset[] = [
  {
    id: 'travel',
    label: 'Travel & lifestyle',
    templates: [
      t(
        'budget-travel',
        'Budget Travel',
        'Trips on a shoestring, with the receipts.',
        'peach',
        'wallet',
      ),
      t(
        'solo-travelers',
        'Solo Travelers',
        'Going it alone, never lonely.',
        'lavender',
        'backpack',
      ),
      t(
        'travel-photography',
        'Travel Photography',
        'Shots, spots and gear talk.',
        'aqua',
        'camera',
      ),
      t('food-finds', 'Food Finds', 'The best bites, wherever you land.', 'peach', 'utensils'),
      t('road-trips', 'Road Trips & Van Life', 'Long drives and small homes.', 'white', 'car'),
      t('slow-living', 'Slow Living', 'Quiet mornings and unhurried days.', 'lavender', 'sunrise'),
    ],
  },
  {
    id: 'food',
    label: 'Food',
    templates: [
      t('home-cooks', 'Home Cooks', 'Weeknight dinners and Sunday projects.', 'peach', 'utensils'),
      t('bakers', 'Bakers', 'Bread, pastry and patient dough.', 'lavender', 'heart'),
      t('street-food', 'Street Food', 'Stalls, carts and late-night bites.', 'aqua', 'globe'),
      t('plant-based', 'Plant-Based', 'Cooking with what grows.', 'aqua', 'leaf'),
      t(
        'restaurant-hunters',
        'Restaurant Hunters',
        'Where to book and where to skip.',
        'white',
        'users',
      ),
    ],
  },
  {
    id: 'fitness',
    label: 'Fitness',
    templates: [
      t('strength', 'Strength Crew', 'Programs, form checks and PRs.', 'peach', 'dumbbell'),
      t('runners', 'Runners', 'Easy miles, race days and shoe talk.', 'aqua', 'sunrise'),
      t('home-workouts', 'Home Workouts', 'No gym, no excuses.', 'lavender', 'heart'),
      t('outdoor-training', 'Outdoor Training', 'Trails, parks and open air.', 'aqua', 'leaf'),
      t('accountability', 'Accountability Buddies', 'Check in, show up, repeat.', 'white', 'users'),
    ],
  },
  {
    id: 'music',
    label: 'Music',
    templates: [
      t(
        'songwriters',
        'Songwriters',
        'Drafts, lyrics and honest feedback.',
        'lavender',
        'pen-tool',
      ),
      t('producers', 'Producers', 'Beats, mixes and plug-in talk.', 'aqua', 'music'),
      t('live-shows', 'Live Shows', 'Gigs, tours and front-row stories.', 'peach', 'mic'),
      t('covers', 'Covers & Collabs', 'Play it your way, together.', 'white', 'users'),
      t('gear-heads', 'Gear Heads', 'Instruments, pedals and studio setups.', 'peach', 'camera'),
    ],
  },
  {
    id: 'beauty',
    label: 'Beauty',
    templates: [
      t('skincare', 'Skincare', 'Routines that work, no hype.', 'aqua', 'leaf'),
      t('makeup', 'Makeup Looks', 'Everyday glam and bold ideas.', 'peach', 'palette'),
      t('hair', 'Hair Days', 'Cuts, care and styling tricks.', 'lavender', 'heart'),
      t('nails', 'Nail Art', 'Small canvases, big ideas.', 'peach', 'pen-tool'),
      t('clean-beauty', 'Clean Beauty', 'Ingredients explained plainly.', 'white', 'book-open'),
    ],
  },
];

export const DEFAULT_PRESET = 'travel';

/** Every template across presets, so a pick survives switching presets. */
export const COMMUNITY_TEMPLATES: CommunityTemplate[] = COMMUNITY_PRESETS.flatMap(
  (p) => p.templates,
);

export function communityFromTemplate(template: CommunityTemplate): CommunityDraft {
  return {
    name: template.name,
    description: template.description,
    tint: template.tint,
    icon: template.icon,
    templateId: template.id,
  };
}

// ---------------------------------------------------------------- taste examples

export const TASTE_EXAMPLES = {
  promote: [
    'Trips and places I would actually go',
    'Guides and ideas my fans make',
    'Brand deals that fit my videos',
  ],
  never: ['Crypto and gambling', 'Get-rich-quick courses', 'Products I have not tried'],
} as const;

// ---------------------------------------------------------------- platforms

export const PLATFORM_URL_EXAMPLE: Record<Platform, (handle: string) => string> = {
  youtube: (h) => `https://youtube.com/@${h}`,
  instagram: (h) => `https://instagram.com/${h}`,
  x: (h) => `https://x.com/${h}`,
  tiktok: (h) => `https://tiktok.com/@${h}`,
  linkedin: (h) => `https://linkedin.com/in/${h}`,
  other: (h) => `https://${h}.com`,
};

const PLATFORM_HOSTS: [RegExp, Platform][] = [
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, 'youtube'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)x\.com$|(^|\.)twitter\.com$/, 'x'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)linkedin\.com$/, 'linkedin'],
];

/** Guesses the platform from a profile link, so pasting a TikTok link into a YouTube row fixes the row. */
export function detectPlatform(url: string): Platform | null {
  try {
    const host = new URL(url).host.toLowerCase();
    for (const [pattern, platform] of PLATFORM_HOSTS) if (pattern.test(host)) return platform;
  } catch {
    // not a URL yet
  }
  return null;
}

/** Adds https:// to a bare domain such as "youtube.com/@mira". Leaves anything else as typed. */
export function withProtocol(value: string): string {
  const v = value.trim();
  if (!v || /^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(v)) return `https://${v}`;
  return v;
}

// ---------------------------------------------------------------- numbers

/** "410K", "1.2M", "410,000" or "410000" to a whole number; NaN when unreadable. */
export function parseFollowers(raw: string): number {
  const v = raw
    .trim()
    .replace(/[,\s_]/g, '')
    .toLowerCase();
  if (!v) return Number.NaN;
  const match = /^(\d+(?:\.\d+)?)([kmb])?$/.exec(v);
  if (!match) return Number.NaN;
  const base = Number(match[1]);
  const mult = match[2] === 'k' ? 1e3 : match[2] === 'm' ? 1e6 : match[2] === 'b' ? 1e9 : 1;
  return Math.round(base * mult);
}

const fullFormat = new Intl.NumberFormat('en-US');

export function formatFull(n: number): string {
  return Number.isFinite(n) ? fullFormat.format(n) : '';
}

/** 410000 to "410K", 1250000 to "1.3M", as on the bio link chips. */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '';
  if (n < 1000) return String(n);
  const units: [number, string][] = [
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [size, suffix] of units) {
    if (n >= size) {
      const value = n / size;
      const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
      if (rounded >= 1000 && suffix !== 'B') continue;
      return `${rounded}${suffix}`;
    }
  }
  return String(n);
}

export function totalFollowers(platforms: PlatformDraft[]): { total: number; count: number } {
  let total = 0;
  let count = 0;
  for (const p of platforms) {
    if (Number.isFinite(p.followers) && p.followers > 0) {
      total += p.followers;
      count += 1;
    }
  }
  return { total, count };
}

// ---------------------------------------------------------------- people

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

const AVATAR_TINTS = ['bg-peach-tile', 'bg-lavender-tile', 'bg-aqua-tile'] as const;

/** Initials sit on a pastel tile picked by hashing the name (DESIGN.md avatar). */
export function avatarTint(name: string): string {
  let hash = 0;
  for (const ch of name.trim().toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length] ?? AVATAR_TINTS[0];
}

// ---------------------------------------------------------------- draft (localStorage)

const DRAFT_KEY = 'fo:onboarding-draft:v1';

export interface OnboardingDraft {
  step: StepIndex;
  values: OnboardingValues;
}

function asString(v: unknown, max = 5000): string {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

function asStringList(v: unknown, fallback: string[]): string[] {
  if (!Array.isArray(v)) return fallback;
  const list = v.filter((x): x is string => typeof x === 'string').slice(0, 10);
  return list.length > 0 ? list : fallback;
}

/** Reads a saved draft and repairs anything malformed, so an old or edited draft never breaks the page. */
export function loadDraft(): OnboardingDraft | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { step?: unknown; values?: Record<string, unknown> };
    const v = data.values ?? {};
    const platforms = Array.isArray(v.platforms)
      ? (v.platforms as Record<string, unknown>[]).slice(0, 6).map((p) => ({
          platform: (PLATFORMS as readonly string[]).includes(p.platform as string)
            ? (p.platform as Platform)
            : 'other',
          url: asString(p.url, 2048),
          followers: typeof p.followers === 'number' ? p.followers : Number.NaN,
          handle: typeof p.handle === 'string' ? p.handle.slice(0, 100) : undefined,
          fetchedAt: typeof p.fetchedAt === 'string' ? p.fetchedAt.slice(0, 40) : undefined,
        }))
      : DEFAULT_VALUES.platforms;
    const communities = Array.isArray(v.communities)
      ? (v.communities as Record<string, unknown>[])
          .filter((c) => typeof c.name === 'string')
          .slice(0, 20)
          .map((c) => ({
            name: asString(c.name, 40),
            description: asString(c.description, 200) || undefined,
            tint: (['peach', 'lavender', 'aqua', 'lime', 'white'] as const).includes(c.tint as Tint)
              ? (c.tint as Tint)
              : 'white',
            icon: (COMMUNITY_ICONS as readonly string[]).includes(c.icon as string)
              ? (c.icon as CommunityIcon)
              : 'users',
            templateId: typeof c.templateId === 'string' ? c.templateId : undefined,
          }))
      : [];
    const taste = (v.tasteProfile ?? {}) as Record<string, unknown>;
    const step = Number(data.step);
    return {
      step: (step >= 0 && step <= 3 ? step : 0) as StepIndex,
      values: {
        handle: asString(v.handle, 30),
        displayName: asString(v.displayName, 60),
        bio: asString(v.bio, 400),
        avatarUrl: asString(v.avatarUrl, 350_000) || undefined,
        platforms,
        communities,
        tasteProfile: {
          promote: asStringList(taste.promote, ['']),
          never: asStringList(taste.never, ['']),
          voice: asStringList(taste.voice, ['']).slice(0, 5),
        },
      },
    };
  } catch {
    return null;
  }
}

export function saveDraft(draft: OnboardingDraft): void {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Private mode or storage full: the form still works, it just won't survive a reload.
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
    window.localStorage.removeItem(IMPORT_KEY);
  } catch {
    // ignore
  }
}

/** True when nothing worth restoring has been typed. */
export function isBlankDraft(values: OnboardingValues): boolean {
  return (
    !values.handle &&
    !values.displayName &&
    !values.bio &&
    values.communities.length === 0 &&
    values.platforms.every((p) => !p.url && !Number.isFinite(p.followers)) &&
    [
      ...values.tasteProfile.promote,
      ...values.tasteProfile.never,
      ...values.tasteProfile.voice,
    ].every((line) => !line.trim())
  );
}

// ---------------------------------------------------------------- platform import (spec §6)

export type LookupFailure = 'private' | 'not_found' | 'unavailable' | 'unsupported' | 'busy';

/** One pasted link: one chip. One per platform; a newer link for the same platform replaces it. */
export interface LookupEntry {
  platform: LookupPlatform | null;
  url: string;
  status: 'pending' | 'ready' | 'failed';
  profile?: PlatformProfile;
  reason?: LookupFailure;
}

/** What the import has done so far. Saved beside the draft, so a reload keeps the chips and hints. */
export interface ImportState {
  entries: LookupEntry[];
  suggestions: SetupSuggestions | null;
  suggesting: boolean;
  /** "Use this" was pressed: name, photo, bio and follower counts went into the form. */
  used: boolean;
  /** "Skip, I'll type it": nothing imported is offered anywhere. */
  skipped: boolean;
  /** Suggestions already poured into a step once, so clearing them there sticks. */
  applied: { taste: boolean; communities: boolean };
}

export const EMPTY_IMPORT: ImportState = {
  entries: [],
  suggestions: null,
  suggesting: false,
  used: false,
  skipped: false,
  applied: { taste: false, communities: false },
};

export const LOOKUP_LABELS: Record<LookupPlatform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  x: 'X',
};

/** The platform a pasted link is for, when it is one the lookup reads; the server parses it again. */
export function lookupPlatformOf(url: string): LookupPlatform | null {
  const platform = detectPlatform(url);
  return platform && (LOOKUP_PLATFORMS as readonly string[]).includes(platform)
    ? (platform as LookupPlatform)
    : null;
}

/** Links in pasted text, split on whitespace and commas, each given https:// if it lacks one. */
export function linksIn(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[\s,]+/)
        .map((part) => withProtocol(part))
        .filter(Boolean),
    ),
  ];
}

/** "Instagram", "Instagram and YouTube", "Instagram, TikTok and YouTube". */
export function platformList(platforms: LookupPlatform[]): string {
  const names = [...new Set(platforms)].map((p) => LOOKUP_LABELS[p]);
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

const IMPORT_KEY = 'fo:onboarding-import:v1';

/** Reads the saved import; in-flight lookups never survive a reload, and a bad profile is dropped. */
export function loadImport(): ImportState | null {
  try {
    const raw = window.localStorage.getItem(IMPORT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<ImportState>;
    const entries = (Array.isArray(data.entries) ? data.entries : [])
      .filter((e) => e && e.status !== 'pending')
      .slice(0, LOOKUP_PLATFORMS.length)
      .flatMap((e): LookupEntry[] => {
        if (e.status === 'ready') {
          const parsed = platformProfileSchema.safeParse(e.profile);
          return parsed.success
            ? [
                {
                  platform: parsed.data.platform,
                  url: asString(e.url, 2048),
                  status: 'ready',
                  profile: parsed.data as PlatformProfile,
                },
              ]
            : [];
        }
        return [
          {
            platform: lookupPlatformOf(asString(e.url, 2048)),
            url: asString(e.url, 2048),
            status: 'failed',
            reason: e.reason,
          },
        ];
      });
    const s = data.suggestions;
    const suggestions =
      s && Array.isArray(s.loves) && Array.isArray(s.voice) && Array.isArray(s.communities)
        ? s
        : null;
    return {
      ...EMPTY_IMPORT,
      entries,
      suggestions,
      used: data.used === true,
      skipped: data.skipped === true,
      applied: {
        taste: data.applied?.taste === true,
        communities: data.applied?.communities === true,
      },
    };
  } catch {
    return null;
  }
}

export function saveImport(state: ImportState): void {
  try {
    window.localStorage.setItem(IMPORT_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the import still works for this visit.
  }
}
