import { Series, useVideoConfig } from "remotion";
import { Soundtrack } from "./audio/Soundtrack";
import { Build } from "./scenes/Build";
import { FanJoin } from "./scenes/FanJoin";
import { Hook } from "./scenes/Hook";
import { Outro } from "./scenes/Outro";
import { Problem } from "./scenes/Problem";
import { Solution } from "./scenes/Solution";
import { Today } from "./scenes/Today";
import { Triage } from "./scenes/Triage";
import { DURATION } from "./timeline";

// The eight scenes back to back on bar lines (no TransitionSeries: transitions live inside the scenes), plus the soundtrack.
export const LaunchVideo: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      <Series>
        <Series.Sequence
          name="Hook"
          durationInFrames={DURATION.Hook}
          premountFor={fps}
        >
          <Hook />
        </Series.Sequence>
        <Series.Sequence
          name="Problem"
          durationInFrames={DURATION.Problem}
          premountFor={fps}
        >
          <Problem />
        </Series.Sequence>
        <Series.Sequence
          name="Solution"
          durationInFrames={DURATION.Solution}
          premountFor={fps}
        >
          <Solution />
        </Series.Sequence>
        <Series.Sequence
          name="FanJoin"
          durationInFrames={DURATION.FanJoin}
          premountFor={fps}
        >
          <FanJoin />
        </Series.Sequence>
        <Series.Sequence
          name="Triage"
          durationInFrames={DURATION.Triage}
          premountFor={fps}
        >
          <Triage />
        </Series.Sequence>
        <Series.Sequence
          name="Today"
          durationInFrames={DURATION.Today}
          premountFor={fps}
        >
          <Today />
        </Series.Sequence>
        <Series.Sequence
          name="Build"
          durationInFrames={DURATION.Build}
          premountFor={fps}
        >
          <Build />
        </Series.Sequence>
        <Series.Sequence
          name="Outro"
          durationInFrames={DURATION.Outro}
          premountFor={fps}
        >
          <Outro />
        </Series.Sequence>
      </Series>
      <Soundtrack />
    </>
  );
};
