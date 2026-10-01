// The loop scene: frame paths, stage timing and copy (landing brief v2, part 4).
// Frames come from the Veo 3.1 clip, cut into 120 WebP frames per set (public/frames/loop).

import { creator, fan, messages, promoteDraft, showcase } from './demo-data';

export const LOOP_FRAME_COUNT = 120;
export const LOOP_POSTER = '/frames/loop/poster.webp';
/** Source frames are 16:9 in both sets (1600x900 desktop, 900x506 mobile). */
export const LOOP_FRAME_RATIO = 16 / 9;
/** Below this viewport width the scene uses the mobile frame set and the 1.3x canvas zoom. */
export const LOOP_PHONE_MAX = 767;
export const LOOP_PHONE_ZOOM = 1.3;

export type LoopFrameSet = 'desktop' | 'mobile';

/** `index` is zero-based; files are frame_0001 to frame_0120. */
export function loopFrameSrc(set: LoopFrameSet, index: number): string {
  return `/frames/loop/${set}/frame_${String(index + 1).padStart(4, '0')}.webp`;
}

export interface LoopStage {
  id: string;
  name: string;
  line: string;
  /** Zero-based frame range the stage owns, timed against what the clip shows. */
  firstFrame: number;
  lastFrame: number;
  /** Zero-based key frame for the reduced-motion and no-JS stack. */
  keyFrame: number;
  alt: string;
}

export const loopStages: LoopStage[] = [
  {
    id: 'followers',
    name: 'Followers',
    line: `${creator.followers} people follow ${creator.firstName}. Until now, they were one number.`,
    firstFrame: 0,
    lastFrame: 23,
    keyFrame: 9,
    alt: 'Hundreds of small clay spheres in orange, purple and teal, scattered across a pearl-grey floor.',
  },
  {
    id: 'communities',
    name: 'Communities',
    line: 'They join the communities that fit them, in under a minute.',
    firstFrame: 24,
    lastFrame: 52,
    keyFrame: 49,
    alt: 'The spheres gathered into six rounded clusters, one for each colour.',
  },
  {
    id: 'ideas',
    name: 'Ideas',
    line: 'Members share ideas. Signals show which ones matter.',
    firstFrame: 53,
    lastFrame: 73,
    keyFrame: 62,
    alt: 'Bright sparks rising from all six clusters.',
  },
  {
    id: 'collaboration',
    name: 'Collaboration',
    line: 'Teams form around projects, one role at a time.',
    firstFrame: 74,
    lastFrame: 92,
    keyFrame: 87,
    alt: 'Thin glowing lines linking the six clusters to each other.',
  },
  {
    id: 'action',
    name: 'Action',
    line: `${creator.firstName} puts her reach behind the best one, with a page and a tracked link.`,
    firstFrame: 93,
    lastFrame: 119,
    keyFrame: 119,
    alt: 'One cluster lifted into a single glowing card at the centre, the other clusters around it.',
  },
];

/**
 * Where the lifted card's face sits in the source frame once it faces the camera (frames 116 to 120,
 * measured from the 1600x900 set), as fractions of the frame. The scene lays the "Featured by Mira" card on it.
 */
export const LOOP_CARD_FACE = { left: 0.364, top: 0.157, right: 0.634, bottom: 0.811 } as const;

const featured = showcase[0];

const teamSize = featured?.team ?? 4;
/** Arjun plus people from the demo inbox who offered to help (Maya, Sana, Kofi). */
const teamNames = [
  fan.name,
  ...['Maya Chen', 'Sana Iqbal', 'Kofi Mensah'].filter((name) =>
    messages.some((message) => message.from === name),
  ),
].slice(0, teamSize);

/** The project the Action stage lands on (demo data). */
export const loopFeatured = {
  title: featured?.title ?? 'Gym-log app for creators',
  community: featured?.community ?? 'Builders',
  maker: fan.firstName,
  team: teamSize,
  teamInitials: teamNames.map((name) =>
    name
      .split(' ')
      .map((part) => part[0])
      .join(''),
  ),
  signals: featured?.signals ?? 212,
  shortLink: promoteDraft.shortLink,
  clicks: promoteDraft.clicks,
  /** Clicks on the short link over the last seven days; sums to `clicks`. */
  clicksByDay: [64, 92, 118, 155, 210, 287, 358],
};
