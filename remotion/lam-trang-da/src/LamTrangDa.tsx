import {Audio} from "@remotion/media";
import type {FC} from "react";
import {AbsoluteFill, Sequence, staticFile} from "remotion";
import {CaptionTrack} from "./CaptionTrack";
import {audioFile, scenes, type SceneId} from "./timeline";
import {
  AloeBoard,
  BeanBoard,
  BridgeBoard,
  CtaBoard,
  HookBoard,
  Paper,
} from "./whiteboard";

const sceneComponent: Record<SceneId, FC> = {
  hook: HookBoard,
  bridge: BridgeBoard,
  aloe: AloeBoard,
  bean: BeanBoard,
  cta: CtaBoard,
};

export const LamTrangDa = () => {
  return (
    <AbsoluteFill>
      <Paper />
      <Audio src={staticFile(audioFile)} />
      {scenes.map((scene) => {
        const SceneView = sceneComponent[scene.id];
        return (
          <Sequence
            key={scene.id}
            name={scene.label}
            from={scene.startFrame}
            durationInFrames={scene.durationInFrames}
          >
            <SceneView />
          </Sequence>
        );
      })}
      <CaptionTrack />
    </AbsoluteFill>
  );
};
