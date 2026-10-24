import {Audio} from "@remotion/media";
import type {FC} from "react";
import {AbsoluteFill, Sequence, staticFile, useCurrentFrame} from "remotion";
import {AlumScene} from "./scenes/AlumScene";
import {BridgeScene} from "./scenes/BridgeScene";
import {CitrusScene} from "./scenes/CitrusScene";
import {CtaScene} from "./scenes/CtaScene";
import {HookScene} from "./scenes/HookScene";
import {audioFile, cues, scenes, type SceneId} from "./timeline";
import {SceneProps, ink, lime} from "./ui";

const sceneComponent: Record<SceneId, FC<SceneProps>> = {
  hook: HookScene,
  bridge: BridgeScene,
  alum: AlumScene,
  citrus: CitrusScene,
  cta: CtaScene,
};

const Progress = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 28,
        right: 28,
        display: "flex",
        gap: 8,
        zIndex: 5,
      }}
    >
      {scenes.map((scene) => {
        const filled =
          frame <= scene.startFrame
            ? 0
            : Math.min(1, (frame - scene.startFrame) / scene.durationInFrames);
        return (
          <div
            key={scene.id}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 99,
              background: "rgba(255,255,255,0.32)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${filled * 100}%`,
                height: "100%",
                background: lime,
                borderRadius: 99,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export const TriHoiNach = () => {
  return (
    <AbsoluteFill style={{backgroundColor: ink}}>
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
      <Progress />
    </AbsoluteFill>
  );
};
