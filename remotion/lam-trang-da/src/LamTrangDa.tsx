import {Audio} from "@remotion/media";
import type {FC} from "react";
import {AbsoluteFill, Sequence, staticFile} from "remotion";
import {AloeScene} from "./scenes/AloeScene";
import {BeanScene} from "./scenes/BeanScene";
import {BridgeScene} from "./scenes/BridgeScene";
import {CtaScene} from "./scenes/CtaScene";
import {HookScene} from "./scenes/HookScene";
import {audioFile, cues, scenes, type SceneId} from "./timeline";
import {canvas, type SceneProps} from "./ui";

const sceneComponent: Record<SceneId, FC<SceneProps>> = {
  hook: HookScene,
  bridge: BridgeScene,
  aloe: AloeScene,
  bean: BeanScene,
  cta: CtaScene,
};

export const LamTrangDa = () => {
  return (
    <AbsoluteFill style={{backgroundColor: canvas}}>
      <Audio src={staticFile(audioFile)} />
      {scenes.map((scene) => {
        const SceneView = sceneComponent[scene.id];
        const sceneCues = cues.filter((cue) => cue.scene === scene.id);
        const cueFrames = sceneCues.map(
          (cue) => cue.startFrame - scene.startFrame,
        );
        const captions = sceneCues.map((cue) => cue.caption);
        return (
          <Sequence
            key={scene.id}
            name={scene.label}
            from={scene.startFrame}
            durationInFrames={scene.durationInFrames}
          >
            <SceneView cueFrames={cueFrames} captions={captions} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
