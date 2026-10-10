// The five loop stages: 48 scene frames each from LOOP_START, each remapping a span of the 120 source frames.
export const LOOP_START = 160;
export const STAGE_LEN = 48;
export const LAST_SRC = 119;

export const STAGES = [
  { label: "Followers", line: "740K followers, scattered.", src: [0, 23] },
  {
    label: "Communities",
    line: "They join the communities that fit them.",
    src: [24, 52],
  },
  {
    label: "Ideas",
    line: "Members share ideas. Signals show which matter.",
    src: [53, 73],
  },
  {
    label: "Collaboration",
    line: "Teams form around projects.",
    src: [74, 92],
  },
  { label: "Action", line: "Mira backs the best one.", src: [93, LAST_SRC] },
] as const;

export const stageStart = (i: number): number => LOOP_START + i * STAGE_LEN;

/** Index of the stage playing at `frame` (the last stage holds afterwards). */
export const stageAt = (frame: number): number =>
  Math.max(
    0,
    Math.min(STAGES.length - 1, Math.floor((frame - LOOP_START) / STAGE_LEN)),
  );

/** Fractional source frame at a scene frame: 0 before the loop, the stage's span during it, LAST_SRC held after. */
export function sourceFrame(frame: number): number {
  if (frame < LOOP_START) return 0;
  const i = stageAt(frame);
  const [a, b] = STAGES[i].src;
  const t = Math.min(1, (frame - stageStart(i)) / (STAGE_LEN - 1));
  return a + (b - a) * t;
}

// Caption schedule for the stage line and the rail's lime pill. ponytail: decoupled from the 48-frame footage stages
// because 48 minus a swap can never hold a line for 45 frames. Line 1 settles at 162 (pill enters 150 to 162 with the
// iris); swaps of SWAP_LEN every 52 frames (207, 259, 311, 363) hold lines 1 to 4 for 45 frames and line 5 for 48
// (370 to the 418 exit). Captions trail the footage stage starts by -1, +3, +7, +11 frames.
export const SWAP_LEN = 7;
const SWAP_EVERY = 52;
const SWAP_BASE = 155;
export const swapStart = (i: number): number => SWAP_BASE + i * SWAP_EVERY;
/** Index of the caption showing at `frame` (0 before the first swap, the last one held afterwards). */
export const swapAt = (frame: number): number =>
  Math.max(
    0,
    Math.min(STAGES.length - 1, Math.floor((frame - SWAP_BASE) / SWAP_EVERY)),
  );
