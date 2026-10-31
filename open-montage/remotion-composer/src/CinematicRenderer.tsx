import React from "react";
import { loadBeVietnam, loadSpaceGrotesk } from "./lib/localFonts";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { CinematicRendererProps, CinematicVideoScene } from "./cinematic/types";
import { CaptionOverlay } from "./components/CaptionOverlay";
import { resolveAsset } from "./lib/resolveAsset";

const FPS = 30;

const { fontFamily } = loadSpaceGrotesk(["400", "500", "700"]);
const { fontFamily: beVietnamFamily } = loadBeVietnam();

const SceneVideo: React.FC<{ scene: CinematicVideoScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.max(1, Math.round(scene.durationSeconds * fps));
  const fadeInFrames = scene.fadeInFrames ?? 10;
  const fadeOutFrames = scene.fadeOutFrames ?? 10;
  const fadeOutStart = Math.max(0, durationInFrames - fadeOutFrames);
  const fadeInOpacity =
    fadeInFrames === 0
      ? 1
      : interpolate(frame, [0, fadeInFrames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const fadeOutOpacity =
    fadeOutFrames === 0
      ? 1
      : interpolate(frame, [fadeOutStart, durationInFrames], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const opacity = Math.min(fadeInOpacity, fadeOutOpacity);

  const scale = interpolate(frame, [0, durationInFrames], [1.015, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const trimBefore =
    scene.trimBeforeSeconds !== undefined
      ? Math.round(scene.trimBeforeSeconds * fps)
      : undefined;
  const trimAfter =
    scene.trimAfterSeconds !== undefined
      ? Math.round(scene.trimAfterSeconds * fps)
      : undefined;

  return (
    <AbsoluteFill style={{ backgroundColor: "#020407", opacity }}>
      <OffthreadVideo
        muted
        src={resolveAsset(scene.src)}
        trimBefore={trimBefore}
        trimAfter={trimAfter}
        playbackRate={scene.playbackRate}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          filter:
            scene.filter ?? "contrast(1.03) saturate(1.02) brightness(1.06)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at center, transparent 72%, rgba(0,0,0,0.16) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 8%, transparent 92%, rgba(255,255,255,0.02) 100%)",
          opacity: 0.6,
        }}
      />
    </AbsoluteFill>
  );
};

const SignalTexture: React.FC<{
  accent: string;
  intensity: number;
  lineCount: number;
}> = ({ accent, intensity, lineCount }) => {
  const frame = useCurrentFrame();
  // The frame width, not a hardcoded 1920: odd lines sit on the right edge.
  const { width: frameWidth } = useVideoConfig();

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {new Array(lineCount).fill(true).map((_, index) => {
        const pulse = Math.max(0, Math.sin(frame * 0.06 + index * 0.85));
        const opacity = (0.025 + pulse * 0.07) * intensity;
        const width = 18 + ((index * 37) % 56);
        const top = 140 + index * 42;
        const left = index % 2 === 0 ? 0 : frameWidth - width;

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              top,
              left,
              width,
              height: 1,
              background: accent,
              boxShadow: `0 0 16px ${accent}`,
              opacity,
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(180deg, rgba(255,255,255,0.028) 0px, rgba(255,255,255,0.028) 1px, transparent 2px, transparent 6px)",
          opacity: 0.12 * intensity,
        }}
      />
    </AbsoluteFill>
  );
};

const TitleCard: React.FC<{
  text: string;
  accent: string;
  intensity: number;
  titleFontSize: number;
  titleWidth: number;
  signalLineCount: number;
  fontFamily?: string;
  backgroundSrc?: string;
  backgroundTrimBeforeSeconds?: number;
  backgroundTrimAfterSeconds?: number;
  variant?: "plate" | "overlay";
}> = ({
  text,
  accent,
  intensity,
  titleFontSize,
  titleWidth,
  signalLineCount,
  fontFamily: titleFont = fontFamily,
  backgroundSrc,
  backgroundTrimBeforeSeconds,
  backgroundTrimAfterSeconds,
  variant = "plate",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const container = spring({
    fps,
    frame,
    config: { damping: 22, stiffness: 80 },
  });

  const exit = interpolate(
    frame,
    [durationInFrames - 14, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Split by newlines first (each line rendered in its own block),
  // then word-stagger inside each line. This preserves intentional
  // \n separators (e.g. "TITLE 1\nTITLE 2") that the old whitespace
  // regex was collapsing into a single space.
  const lines = text.split(/\r?\n/);
  const staggerFrames = 3;
  const wordFadeFrames = 14;

  const lineGrow = interpolate(frame, [0, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineExit = exit;
  const flareOpacity =
    0.22 + Math.max(0, Math.sin(frame * 0.09)) * 0.18 * intensity;

  const bgScale = interpolate(frame, [0, durationInFrames], [1.04, 1.1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bgTrimBefore =
    backgroundTrimBeforeSeconds !== undefined
      ? Math.round(backgroundTrimBeforeSeconds * fps)
      : undefined;
  const bgTrimAfter =
    backgroundTrimAfterSeconds !== undefined
      ? Math.round(backgroundTrimAfterSeconds * fps)
      : undefined;

  const plateBg =
    variant === "overlay"
      ? "transparent"
      : "radial-gradient(ellipse at 50% 50%, rgba(8,14,22,0.78) 0%, rgba(2,4,8,0.92) 58%, rgba(0,0,0,1) 100%)";

  return (
    <AbsoluteFill
      style={{
        background: "#000",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {backgroundSrc ? (
        <>
          <AbsoluteFill style={{ transform: `scale(${bgScale})`, opacity: 1 }}>
            <OffthreadVideo
              muted
              src={resolveAsset(backgroundSrc)}
              trimBefore={bgTrimBefore}
              trimAfter={bgTrimAfter}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "contrast(1.03) saturate(1.02) brightness(1.04)",
              }}
            />
          </AbsoluteFill>
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.06) 28%, rgba(0,0,0,0.06) 72%, rgba(0,0,0,0.28) 100%)",
            }}
          />
        </>
      ) : null}

      <AbsoluteFill
        style={{
          background: plateBg,
        }}
      />

      <SignalTexture
        accent={accent}
        intensity={intensity * 0.7}
        lineCount={signalLineCount}
      />

      {/* Top accent line — grows from center outwards */}
      <div
        style={{
          position: "absolute",
          width: 1100 * lineGrow,
          height: 1,
          background: accent,
          boxShadow: `0 0 24px ${accent}`,
          opacity: flareOpacity * lineExit,
          transform: "translateY(-118px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1100 * lineGrow,
          height: 1,
          background: accent,
          boxShadow: `0 0 24px ${accent}`,
          opacity: flareOpacity * 0.75 * lineExit,
          transform: "translateY(118px)",
        }}
      />

      {/* Word-stagger text reveal */}
      <div
        style={{
          opacity: exit,
          width: titleWidth,
          textAlign: "center",
          fontFamily: titleFont,
          fontWeight: 500,
          fontSize: titleFontSize,
          lineHeight: 1.12,
          letterSpacing: "0.16em",
          color: "#f6f4ee",
          textTransform: "uppercase",
          textShadow: "0 0 34px rgba(255,255,255,0.10), 0 0 2px rgba(0,0,0,0.8)",
        }}
      >
        {(() => {
          let wordCounter = 0;
          return lines.map((line, lineIdx) => {
            const tokens = line.split(/(\s+)/).filter((w) => w.length > 0);
            return (
              <div key={lineIdx} style={{ display: "block" }}>
                {tokens.map((w, ti) => {
                  if (/^\s+$/.test(w)) {
                    return <span key={ti}>&nbsp;</span>;
                  }
                  const startFrame = wordCounter * staggerFrames;
                  wordCounter += 1;
                  const wordOpacity = interpolate(
                    frame,
                    [startFrame, startFrame + wordFadeFrames],
                    [0, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                  );
                  const blur = interpolate(
                    frame,
                    [startFrame, startFrame + wordFadeFrames],
                    [6, 0],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                  );
                  const ty = interpolate(
                    frame,
                    [startFrame, startFrame + wordFadeFrames],
                    [14, 0],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                  );
                  return (
                    <span
                      key={ti}
                      style={{
                        display: "inline-block",
                        opacity: wordOpacity,
                        filter: `blur(${blur}px)`,
                        transform: `translateY(${ty}px)`,
                      }}
                    >
                      {w}
                    </span>
                  );
                })}
              </div>
            );
          });
        })()}
      </div>

      {/* Subtle accent dot centered under text */}
      <div
        style={{
          position: "absolute",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: accent,
          boxShadow: `0 0 18px ${accent}`,
          opacity: 0.55 * container * lineExit,
          transform: "translateY(172px)",
        }}
      />
    </AbsoluteFill>
  );
};

const Soundtrack: React.FC<{
  src: string;
  volume: number;
  trimBeforeSeconds?: number;
  trimAfterSeconds?: number;
  fadeInSeconds: number;
  fadeOutSeconds: number;
}> = ({
  src,
  volume,
  trimBeforeSeconds,
  trimAfterSeconds,
  fadeInSeconds,
  fadeOutSeconds,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const fadeInFrames = Math.max(1, Math.round(fadeInSeconds * fps));
  const fadeOutFrames = Math.max(1, Math.round(fadeOutSeconds * fps));
  const trimBefore =
    trimBeforeSeconds !== undefined
      ? Math.round(trimBeforeSeconds * fps)
      : undefined;
  const trimAfter =
    trimAfterSeconds !== undefined
      ? Math.round(trimAfterSeconds * fps)
      : undefined;

  const fadeIn = interpolate(frame, [0, fadeInFrames], [0, volume], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fadeOutFrames, durationInFrames],
    [volume, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <Audio
      src={resolveAsset(src)}
      trimBefore={trimBefore}
      trimAfter={trimAfter}
      volume={() => Math.min(fadeIn, fadeOut)}
    />
  );
};

export const calculateCinematicMetadata: CalculateMetadataFunction<CinematicRendererProps> =
  async ({ props }) => {
    const totalSeconds =
      props.scenes.length === 0
        ? 30
        : Math.max(
            ...props.scenes.map((scene) => scene.startSeconds + scene.durationSeconds),
          );

    const width = typeof props.width === "number" ? props.width : 1920;
    const height = typeof props.height === "number" ? props.height : 1080;
    return {
      durationInFrames: Math.max(1, Math.ceil(totalSeconds * FPS)),
      fps: FPS,
      width,
      height,
    };
  };

export const CinematicRenderer: React.FC<CinematicRendererProps> = ({
  scenes,
  titleFontSize = 78,
  titleWidth = 1320,
  signalLineCount = 18,
  soundtrack,
  music,
  captions,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* Layer 1: Narration audio */}
      {soundtrack ? (
        <Soundtrack
          src={soundtrack.src}
          volume={soundtrack.volume ?? 1}
          trimBeforeSeconds={soundtrack.trimBeforeSeconds}
          trimAfterSeconds={soundtrack.trimAfterSeconds}
          fadeInSeconds={soundtrack.fadeInSeconds ?? 0.3}
          fadeOutSeconds={soundtrack.fadeOutSeconds ?? 0.5}
        />
      ) : null}
      {/* Layer 2: Music bed (separate track, ducked) */}
      {music ? (
        <Soundtrack
          src={music.src}
          volume={music.volume ?? 0.15}
          trimBeforeSeconds={music.trimBeforeSeconds}
          trimAfterSeconds={music.trimAfterSeconds}
          fadeInSeconds={music.fadeInSeconds ?? 2}
          fadeOutSeconds={music.fadeOutSeconds ?? 3}
        />
      ) : null}
      {/* Layer 3: Video scenes */}
      {scenes.map((scene) => (
        <Sequence
          key={scene.id}
          from={Math.round(scene.startSeconds * FPS)}
          durationInFrames={Math.round(scene.durationSeconds * FPS)}
        >
          {scene.kind === "video" ? (
            <SceneVideo scene={scene} />
          ) : (
            <TitleCard
              text={scene.text}
              accent={scene.accent ?? "#86d8ff"}
              intensity={scene.intensity ?? 1}
              titleFontSize={titleFontSize}
              titleWidth={titleWidth}
              signalLineCount={signalLineCount}
              fontFamily={beVietnamFamily}
              backgroundSrc={scene.backgroundSrc}
              backgroundTrimBeforeSeconds={scene.backgroundTrimBeforeSeconds}
              backgroundTrimAfterSeconds={scene.backgroundTrimAfterSeconds}
              variant={scene.variant}
            />
          )}
        </Sequence>
      ))}
      {/* Layer 4: TikTok-style captions */}
      {captions?.words ? (
        <CaptionOverlay
          words={captions.words}
          wordsPerPage={captions.wordsPerPage ?? 5}
          fontSize={captions.fontSize ?? 48}
          color={captions.color ?? "#F8FAFC"}
          highlightColor={captions.highlightColor ?? "#FBBF24"}
          backgroundColor={captions.backgroundColor ?? "rgba(0, 0, 0, 0.6)"}
          fontFamily={captions.fontFamily ?? beVietnamFamily}
        />
      ) : null}
    </AbsoluteFill>
  );
};
