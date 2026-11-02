import React from "react";
import { Composition } from "remotion";
import { VocabularyComparison } from "./types.ts";
import { VocabularyComparisonComposition } from "./compositions/VocabularyComparison/index.tsx";
import { defaultVocabularyComparison } from "./data/default-comparison.ts";
import { DrizzleRepetitionCard } from "./compositions/DrizzleRepetition/DrizzleRepetitionCard.tsx";
import { TossRepetitionCard } from "./compositions/TossRepetition/TossRepetitionCard.tsx";
import { SquatRepetitionCard } from "./compositions/SquatRepetition/SquatRepetitionCard.tsx";
import { TiptoeRepetitionCard } from "./compositions/TiptoeRepetition/TiptoeRepetitionCard.tsx";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 1. Reusable Vocabulary Contrast & Comparison Video Generator */}
      <Composition
        id="VocabularyContrast"
        component={
          VocabularyComparisonComposition as unknown as React.ComponentType<
            Record<string, unknown>
          >
        }
        durationInFrames={
          defaultVocabularyComparison.config.totalDurationInFrames || 900
        }
        fps={defaultVocabularyComparison.config.fps || 30}
        width={defaultVocabularyComparison.config.width || 1080}
        height={defaultVocabularyComparison.config.height || 1920}
        defaultProps={
          defaultVocabularyComparison as unknown as Record<string, unknown>
        }
        calculateMetadata={({ props }) => {
          const comp = props as unknown as VocabularyComparison;
          return {
            durationInFrames: comp.config?.totalDurationInFrames || 900,
            width: comp.config?.width || 1080,
            height: comp.config?.height || 1920,
            fps: comp.config?.fps || 30,
          };
        }}
      />

      {/* 3. Dedicated Say vs Tell Composition */}
      <Composition
        id="SayVsTell"
        component={
          VocabularyComparisonComposition as unknown as React.ComponentType<
            Record<string, unknown>
          >
        }
        durationInFrames={
          defaultVocabularyComparison.config.totalDurationInFrames || 900
        }
        fps={defaultVocabularyComparison.config.fps || 30}
        width={defaultVocabularyComparison.config.width || 1080}
        height={defaultVocabularyComparison.config.height || 1920}
        defaultProps={
          defaultVocabularyComparison as unknown as Record<string, unknown>
        }
      />
      {/* 4. Drizzle Vocabulary Repetition Video (12s, Extended Repetition Scene, Pure English) */}
      <Composition
        id="DrizzleVideo"
        component={DrizzleRepetitionCard}
        durationInFrames={360}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* 5. Toss Vocabulary Repetition Video (12s, Extended Repetition Scene, Pure English) */}
      <Composition
        id="TossVideo"
        component={TossRepetitionCard}
        durationInFrames={360}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* 6. Squat Vocabulary Repetition Video (12s, Extended Repetition Scene, Pure English, High-res Image) */}
      <Composition
        id="SquatVideo"
        component={SquatRepetitionCard}
        durationInFrames={360}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* 7. Tiptoe Vocabulary Repetition Video (12s, Bright Image, Extended Repetition Scene, Pure English) */}
      <Composition
        id="TiptoeVideo"
        component={TiptoeRepetitionCard}
        durationInFrames={360}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};

export default RemotionRoot;
