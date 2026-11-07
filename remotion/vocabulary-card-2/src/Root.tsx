import React from "react";
import { Composition } from "remotion";
import { VocabularyComparison } from "./types.ts";
import { VocabularyComparisonComposition } from "./compositions/VocabularyComparison/index.tsx";
import { defaultVocabularyComparison } from "./data/default-comparison.ts";
import { DrizzleRepetitionCard } from "./compositions/DrizzleRepetition/DrizzleRepetitionCard.tsx";
import { TossRepetitionCard } from "./compositions/TossRepetition/TossRepetitionCard.tsx";
import { SquatRepetitionCard } from "./compositions/SquatRepetition/SquatRepetitionCard.tsx";
import { TiptoeRepetitionCard } from "./compositions/TiptoeRepetition/TiptoeRepetitionCard.tsx";
import { DizzyRepetitionCard } from "./compositions/DizzyRepetition/DizzyRepetitionCard.tsx";
import { HeartAttackRepetitionCard } from "./compositions/HeartAttackRepetition/HeartAttackRepetitionCard.tsx";
import { TenaciousRepetitionCard } from "./compositions/TenaciousRepetition/TenaciousRepetitionCard.tsx";
import { IndifferentRepetitionCard } from "./compositions/IndifferentRepetition/IndifferentRepetitionCard.tsx";
import { RecidivismRepetitionCard } from "./compositions/RecidivismRepetition/RecidivismRepetitionCard.tsx";
import { ExtravagantRepetitionCard } from "./compositions/ExtravagantRepetition/ExtravagantRepetitionCard.tsx";
import { ReluctantRepetitionCard } from "./compositions/ReluctantRepetition/ReluctantRepetitionCard.tsx";
import { MeticulousRepetitionCard } from "./compositions/MeticulousRepetition/MeticulousRepetitionCard.tsx";

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
      {/* 8. Dizzy Vocabulary Repetition Video (7s, Illustration Card, Snappy Repetition + Tock SFX, Pure English) */}
      <Composition
        id="DizzyVideo"
        component={DizzyRepetitionCard}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* 9. Heart Attack Vocabulary Repetition Video (7s, Illustration Card, Snappy Repetition + Tock SFX, Pure English) */}
      <Composition
        id="HeartAttackVideo"
        component={HeartAttackRepetitionCard}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* 10. Tenacious Vocabulary Repetition Video (7s, Illustration Card, Snappy Repetition + Tock SFX, Pure English) */}
      <Composition
        id="TenaciousVideo"
        component={TenaciousRepetitionCard}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* 11. Indifferent Vocabulary Repetition Video (7s, Illustration Card, Snappy Repetition + Tock SFX, Pure English) */}
      <Composition
        id="IndifferentVideo"
        component={IndifferentRepetitionCard}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* 12. Recidivism Vocabulary Repetition Video (9s, Illustration Card, Snappy Repetition + Tock SFX, Pure English) */}
      <Composition
        id="RecidivismVideo"
        component={RecidivismRepetitionCard}
        durationInFrames={270}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* 13. Extravagant Vocabulary Repetition Video (9s, Illustration Card, Snappy Repetition + Tock SFX, Pure English) */}
      <Composition
        id="ExtravagantVideo"
        component={ExtravagantRepetitionCard}
        durationInFrames={270}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* 14. Reluctant Vocabulary Repetition Video (9s, Illustration Card, Snappy Repetition + Tock SFX, Pure English) */}
      <Composition
        id="ReluctantVideo"
        component={ReluctantRepetitionCard}
        durationInFrames={270}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* 15. Meticulous Vocabulary Repetition Video (9s, Illustration Card, Snappy Repetition + Tock SFX, Pure English) */}
      <Composition
        id="MeticulousVideo"
        component={MeticulousRepetitionCard}
        durationInFrames={270}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};

export default RemotionRoot;
