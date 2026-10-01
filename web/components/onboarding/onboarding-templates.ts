import {
  COMMUNITY_ICONS,
  type CommunityIcon,
  type createSpaceSchema,
  type OnboardingCommunityInput,
  PLATFORMS,
  type Platform,
  type Tint,
} from '@fellow-owners/shared';
import {
  BookOpen,
  Camera,
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
  Users,
  Utensils,
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
    helper: 'This is the link for your bio. Fans see your name and one line about you.',
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
    label: 'Taste',
    title: 'Set your taste profile',
    helper:
      'The AI uses this to score how well each pitch and idea fits you, and to write drafts in your voice. Fans never see it.',
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
}

/** createSpaceSchema's input, with the few looser shapes the form needs while typing. */
export interface OnboardingValues {
  handle: string;
  displayName: string;
  bio: string;
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
  ['platforms'],
  ['communities'],
  ['tasteProfile.promote', 'tasteProfile.never', 'tasteProfile.voice'],
] as const;

/** Maps an error path from the API or zod to the step that owns it. */
export function stepForPath(path: string): StepIndex {
  if (path.startsWith('platforms')) return 1;
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
  lime: { card: 'bg-lime/45', tile: 'bg-lime', icon: 'text-ink', swatch: 'bg-lime' },
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

export const COMMUNITY_TEMPLATES: CommunityTemplate[] = [
  {
    id: 'builders',
    name: 'Builders',
    description: 'Developers and makers shipping side projects in public.',
    tint: 'aqua',
    icon: 'code-2',
  },
  {
    id: 'designers',
    name: 'Designers',
    description: 'Product, brand and motion designers sharing work and feedback.',
    tint: 'lavender',
    icon: 'pen-tool',
  },
  {
    id: 'investors',
    name: 'Investors & Operators',
    description: 'Angels, operators and founders who back what the community builds.',
    tint: 'peach',
    icon: 'line-chart',
  },
  {
    id: 'music',
    name: 'Music & Creators',
    description: 'Musicians, editors and creators making things together.',
    tint: 'lavender',
    icon: 'music',
  },
  {
    id: 'fitness',
    name: 'Fitness Crew',
    description: 'Training logs, programs and accountability partners.',
    tint: 'lime',
    icon: 'dumbbell',
  },
  {
    id: 'local-impact',
    name: 'Local Impact',
    description: 'Volunteering, local projects and causes worth showing up for.',
    tint: 'white',
    icon: 'leaf',
  },
  {
    id: 'founders',
    name: 'Founders',
    description: 'People starting companies, trading notes on what works.',
    tint: 'peach',
    icon: 'rocket',
  },
  {
    id: 'photo-video',
    name: 'Photo & Video',
    description: 'Shooters and editors swapping gear tips, edits and critiques.',
    tint: 'aqua',
    icon: 'camera',
  },
  {
    id: 'writers',
    name: 'Writers',
    description: 'Newsletters, essays and scripts, with honest feedback.',
    tint: 'white',
    icon: 'book-open',
  },
];

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
    'Tools I would use myself',
    'Projects built by people in my communities',
    'Paid collabs that fit my content',
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
