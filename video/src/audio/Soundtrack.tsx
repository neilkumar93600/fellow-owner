import { Audio } from "@remotion/media";
import { interpolate, staticFile, useVideoConfig } from "remotion";
import { CUES as BuildCues } from "../scenes/Build";
import { CUES as FanJoinCues } from "../scenes/FanJoin";
import { CUES as HookCues } from "../scenes/Hook";
import { CUES as OutroCues } from "../scenes/Outro";
import { CUES as ProblemCues } from "../scenes/Problem";
import { CUES as SolutionCues } from "../scenes/Solution";
import { CUES as TodayCues } from "../scenes/Today";
import { CUES as TriageCues } from "../scenes/Triage";
import {
  type Cue,
  DURATION,
  FPS,
  START,
  type SceneId,
  SCENE_ORDER,
  type SfxName,
  TOTAL,
} from "../timeline";
import { VO_DURATIONS } from "../voiceover.generated";
import { VO_LINES } from "../voiceover";
import { SFX } from "./sfx";

const SCENE_CUES: Record<SceneId, Cue[]> = {
  Hook: HookCues,
  Problem: ProblemCues,
  Solution: SolutionCues,
  FanJoin: FanJoinCues,
  Triage: TriageCues,
  Today: TodayCues,
  Build: BuildCues,
  Outro: OutroCues,
};

// Every scene cue on video time; cues outside their scene are dropped.
const PLACED = SCENE_ORDER.flatMap((scene) =>
  SCENE_CUES[scene]
    .filter((cue) => cue.frame >= 0 && cue.frame < DURATION[scene])
    .map((cue) => ({ ...cue, scene, at: START[scene] + cue.frame })),
);

// The click/switch/shutter files are about 12 dB quieter (RMS) than whoosh/ding/whip at the same peak (page swells slowly),
// so they get a fixed make-up gain here; scene CUES keep their relative intent.
const MAKEUP: Partial<Record<SfxName, number>> = {
  click: 2.5,
  switch: 2.5,
  shutter: 2.5,
  page: 1.6, // slow swell, peak barely cleared the bed
};
// These files open with about 100 ms (3 frames) of silence; trim it so the hit lands on the cue frame.
const LEAD: Partial<Record<SfxName, number>> = {
  click: 3,
  switch: 3,
  shutter: 3,
  ding: 3,
};

// Gain staging with the voice-over: effects at 60% so voice + bed + effect stacks keep headroom (peaks under -1 dBFS).
const SFX_GAIN = 0.6;
const cueVolume = (cue: Cue) =>
  SFX_GAIN * Math.min(1, (cue.volume ?? 0.3) * (MAKEUP[cue.sfx] ?? 1));

const CUE_AT = PLACED.map((cue) => cue.at);

// Voice-over lines on video frames (scripts/make-voiceover.ts measures each clip).
const VO = VO_LINES.map((line) => {
  const from = Math.round(line.at * FPS);
  return { ...line, from, to: from + Math.ceil((VO_DURATIONS[line.id] ?? 0) * FPS) };
});

// The fitted track is mastered loud (-14 LUFS), so the bed sits at 0.5. Sidechain-style ducks, deepest wins:
// each SFX cue dips it to 69% (one frame before, hold 8, release 6); each voice line dips it to 40%
// (6 frames before the line, release over 10 after the clip ends).
// ponytail: linear scan over ~70 cues + 15 lines per frame; fine at this size.
const BED = 0.5;
// Voice clips are about -18.5 LUFS; at 0.7 they sit about 7 dB over the ducked bed.
const VOICE = 0.7;
const duck = (f: number) =>
  BED *
  Math.min(
    1,
    ...CUE_AT.map((at) =>
      interpolate(f - at, [-2, -1, 8, 14], [1, 0.69, 0.69, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    ),
    ...VO.map((line) =>
      interpolate(f, [line.from - 6, line.from, line.to, line.to + 10], [1, 0.4, 0.4, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    ),
  );

// Fade in over 10 frames, out over the last 45.
const musicVolume = (f: number) =>
  duck(f) *
  interpolate(f, [0, 10, TOTAL - 45, TOTAL], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const Soundtrack: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      <Audio
        name="Music"
        src={staticFile("audio/music-fitted.wav")}
        premountFor={fps}
        volume={musicVolume}
      />
      {PLACED.map((cue) => (
        <Audio
          key={`${cue.scene}-${cue.frame}-${cue.sfx}`}
          name={`${cue.scene} · ${cue.sfx} @${cue.frame}`}
          src={SFX[cue.sfx]}
          from={cue.at}
          trimBefore={LEAD[cue.sfx]}
          volume={cueVolume(cue)}
          premountFor={fps}
        />
      ))}
      {VO.map((line) => (
        <Audio
          key={line.id}
          name={`Voice · ${line.id}`}
          src={staticFile(`voiceover/${line.id}.mp3`)}
          from={line.from}
          volume={VOICE}
          premountFor={fps}
        />
      ))}
    </>
  );
};
