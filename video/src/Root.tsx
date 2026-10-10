import {Composition, Folder} from 'remotion';
import {Kit} from './kit/Kit';
import {LaunchVideo} from './LaunchVideo';
import {Build} from './scenes/Build';
import {FanJoin} from './scenes/FanJoin';
import {Hook} from './scenes/Hook';
import {Outro} from './scenes/Outro';
import {Problem} from './scenes/Problem';
import {Solution} from './scenes/Solution';
import {Today} from './scenes/Today';
import {Triage} from './scenes/Triage';
import {DURATION, FPS, HEIGHT, TOTAL, WIDTH} from './timeline';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="LaunchVideo" component={LaunchVideo} durationInFrames={TOTAL} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Folder name="Scenes">
        <Composition id="Hook" component={Hook} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={DURATION.Hook} />
        <Composition id="Problem" component={Problem} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={DURATION.Problem} />
        <Composition id="Solution" component={Solution} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={DURATION.Solution} />
        <Composition id="FanJoin" component={FanJoin} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={DURATION.FanJoin} />
        <Composition id="Triage" component={Triage} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={DURATION.Triage} />
        <Composition id="Today" component={Today} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={DURATION.Today} />
        <Composition id="Build" component={Build} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={DURATION.Build} />
        <Composition id="Outro" component={Outro} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={DURATION.Outro} />
      </Folder>
      <Folder name="Kit">
        <Composition id="Kit" component={Kit} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={150} />
      </Folder>
    </>
  );
};
