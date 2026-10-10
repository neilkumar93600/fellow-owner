// Single source of truth for timing. Read by src/Root.tsx, src/LaunchVideo.tsx and scripts/make-music.ts,
// so scene cuts and the music's bar lines always agree. Plain TS (no enums) so Node can run it directly.
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const BPM = 120;
export const BEAT = (FPS * 60) / BPM; // 15 frames
export const BAR = BEAT * 4; // 60 frames = 2 s

export const SCENE_BARS = {
  Hook: 4,
  Problem: 6,
  Solution: 8,
  FanJoin: 5,
  Triage: 4,
  Today: 4,
  Build: 7,
  Outro: 4,
} as const;

export type SceneId = keyof typeof SCENE_BARS;
export const SCENE_ORDER = Object.keys(SCENE_BARS) as SceneId[];

export const DURATION = Object.fromEntries(
  SCENE_ORDER.map((id) => [id, SCENE_BARS[id] * BAR]),
) as Record<SceneId, number>;

export const START = (() => {
  let at = 0;
  const out = {} as Record<SceneId, number>;
  for (const id of SCENE_ORDER) {
    out[id] = at;
    at += DURATION[id];
  }
  return out;
})();

export const TOTAL = SCENE_ORDER.reduce((sum, id) => sum + DURATION[id], 0);

/**
 * Sound effect moments. Each scene exports `CUES: Cue[]` in scene-local frames; LaunchVideo offsets them by
 * START and plays the matching file from src/audio/sfx.ts, so sounds move with the picture.
 */
export type SfxName = 'whoosh' | 'whip' | 'switch' | 'click' | 'ding' | 'page' | 'shutter';
export type Cue = { frame: number; sfx: SfxName; volume?: number };
