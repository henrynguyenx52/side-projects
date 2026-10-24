import {Audio} from "@remotion/media";
import type {FC} from "react";
import {AbsoluteFill, Sequence, staticFile} from "remotion";
import {Captions} from "./Captions";
import {DieselScene} from "./scenes/DieselScene";
import {FundScene} from "./scenes/FundScene";
import {GasolineScene} from "./scenes/GasolineScene";
import {OpenScene} from "./scenes/OpenScene";
import {PolicyScene} from "./scenes/PolicyScene";
import {PriorScene} from "./scenes/PriorScene";
import {RetailScene} from "./scenes/RetailScene";
import {SourceScene} from "./scenes/SourceScene";
import {WorldScene} from "./scenes/WorldScene";
import {audioFile, cues, scenes, type SceneId} from "./timeline";
import {SceneProps, ink} from "./ui";

const sceneComponent: Record<SceneId, FC<SceneProps>> = {
  open: OpenScene,
  gasoline: GasolineScene,
  diesel: DieselScene,
  world: WorldScene,
  fund: FundScene,
  retail: RetailScene,
  prior: PriorScene,
  policy: PolicyScene,
  source: SourceScene,
};

export const GiaXangDau = () => {
  return (
    <AbsoluteFill style={{backgroundColor: ink}}>
      <Audio src={staticFile(audioFile)} />
      {scenes.map((scene) => {
        const SceneView = sceneComponent[scene.id];
        const cueFrames = cues
          .filter((cue) => cue.scene === scene.id)
          .map((cue) => cue.startFrame - scene.startFrame);
        return (
          <Sequence
            key={scene.id}
            name={scene.label}
            from={scene.startFrame}
            durationInFrames={scene.durationInFrames}
          >
            <SceneView cueFrames={cueFrames} />
          </Sequence>
        );
      })}
      <Captions />
    </AbsoluteFill>
  );
};
