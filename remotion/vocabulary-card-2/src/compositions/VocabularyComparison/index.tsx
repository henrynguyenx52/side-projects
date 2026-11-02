import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { VocabularyComparison } from "../../types";
import { BackgroundGlow } from "../../components/BackgroundGlow";
import { HookScene } from "../../scenes/HookScene";
import { WordScene } from "../../scenes/WordScene";
import { ComparisonScene } from "../../scenes/ComparisonScene";
import { MistakeScene } from "../../scenes/MistakeScene";
import { QuizScene } from "../../scenes/QuizScene";
import { CTAScene } from "../../scenes/CTAScene";
import { SubtitleBar } from "../../components/contrast/SubtitleBar";
import { sansFamily } from "../../fonts";

export const VocabularyComparisonComposition: React.FC<VocabularyComparison> = (props) => {
  const {
    wordA,
    wordB,
    comparison,
    commonMistake,
    quiz,
    narration,
    subtitles,
    config,
  } = props;

  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Progress percentage across the entire video
  const progressPercent = Math.min(100, Math.max(8, (frame / durationInFrames) * 100));

  // Map each sceneId to its corresponding React scene component
  const renderSceneContent = (sceneId: string, durationInFrames: number) => {
    switch (sceneId) {
      case "hook":
        return <HookScene wordA={wordA} wordB={wordB} />;
      case "wordA":
        return <WordScene wordDetail={wordA} stepNumber={1} />;
      case "wordB":
        return <WordScene wordDetail={wordB} stepNumber={2} />;
      case "comparison":
        return (
          <ComparisonScene
            wordA={wordA}
            wordB={wordB}
            comparison={comparison}
          />
        );
      case "mistake":
        return commonMistake ? (
          <MistakeScene mistake={commonMistake} />
        ) : null;
      case "quiz":
        return quiz ? (
          <QuizScene quiz={quiz} durationInFrames={durationInFrames} />
        ) : null;
      case "cta":
        return (
          <CTAScene
            wordA={wordA}
            wordB={wordB}
            ctaText={config?.ctaText}
            homework={props.homework}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: config?.theme?.bgColor || "#F7F7F7",
        fontFamily: `${sansFamily}, sans-serif`,
        overflow: "hidden",
      }}
    >
      {/* 1. Ambient Duolingo Atmosphere */}
      <BackgroundGlow />

      {/* 2. Dynamically Sequenced Audio & Visual Scenes */}
      {narration?.scenes?.map((scene) => {
        const audioSrc = scene.audioFile
          ? scene.audioFile.startsWith("http") || scene.audioFile.startsWith("data:")
            ? scene.audioFile
            : staticFile(scene.audioFile)
          : null;

        return (
          <Sequence
            key={scene.sceneId}
            from={scene.startFrame}
            durationInFrames={scene.durationInFrames}
          >
            {/* Synchronized voiceover track for this scene */}
            {audioSrc && <Audio src={audioSrc} />}

            {/* Visual scene content */}
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {renderSceneContent(scene.sceneId, scene.durationInFrames)}
            </div>
          </Sequence>
        );
      })}

      {/* 3. Global Synchronized Subtitle System */}
      {config?.showSubtitles && subtitles && (
        <SubtitleBar subtitles={subtitles} />
      )}

      {/* 4. Duolingo Lesson Top Navigation Bar */}
      <div
        style={{
          position: "absolute",
          top: 48,
          left: 48,
          right: 48,
          display: "flex",
          alignItems: "center",
          gap: 20,
          pointerEvents: "none",
          zIndex: 90,
        }}
      >
        {/* Center Green Progress Bar */}
        <div
          style={{
            flex: 1,
            height: 24,
            background: "#E5E5E5",
            borderRadius: 9999,
            overflow: "hidden",
            position: "relative",
            padding: 3,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPercent}%`,
              background: "#58CC02",
              borderRadius: 9999,
              position: "relative",
              transition: "width 0.1s linear",
            }}
          >
            {/* Glossy top highlight */}
            <div
              style={{
                position: "absolute",
                top: 2,
                left: 8,
                right: 8,
                height: 4,
                borderRadius: 9999,
                background: "rgba(255, 255, 255, 0.45)",
              }}
            />
          </div>
        </div>

        {/* Right Streak & Hearts Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Streak */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#FFFFFF",
              border: "2px solid #E5E5E5",
              borderBottom: "4px solid #DCDCDC",
              padding: "4px 14px",
              borderRadius: 16,
              fontSize: 18,
              fontWeight: 900,
              color: "#FF9600",
            }}
          >
            🔥 <span>7</span>
          </div>

          {/* Hearts */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#FFFFFF",
              border: "2px solid #E5E5E5",
              borderBottom: "4px solid #DCDCDC",
              padding: "4px 14px",
              borderRadius: 16,
              fontSize: 18,
              fontWeight: 900,
              color: "#FF4B4B",
            }}
          >
            ❤️ <span>5</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
