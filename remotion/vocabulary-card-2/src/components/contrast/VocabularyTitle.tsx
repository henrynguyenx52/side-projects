import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { sansFamily, serifFamily } from "../../fonts";

interface VocabularyTitleProps {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  vietnameseMeaning?: string;
  colorAccent: string;
  subtitleTag?: string;
}

export const VocabularyTitle: React.FC<VocabularyTitleProps> = ({
  word,
  phonetic,
  partOfSpeech,
  vietnameseMeaning,
  colorAccent,
  subtitleTag = "Vocabulary Focus",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 15, mass: 0.7, stiffness: 85 },
  });

  const badgeSpring = spring({
    frame: frame - 6,
    fps,
    config: { damping: 15, mass: 0.7, stiffness: 85 },
  });

  const scale = interpolate(titleSpring, [0, 1], [0.88, 1]);
  const translateY = interpolate(titleSpring, [0, 1], [30, 0]);
  const opacity = interpolate(titleSpring, [0, 1], [0, 1]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        transform: `translateY(${translateY}px) scale(${scale})`,
        opacity,
      }}
    >
      {/* Category Pill */}
      <div
        style={{
          fontFamily: `${sansFamily}, sans-serif`,
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: colorAccent,
          marginBottom: 12,
          padding: "6px 18px",
          borderRadius: 9999,
          background: "rgba(255, 255, 255, 0.05)",
          border: `1px solid ${colorAccent}40`,
        }}
      >
        {subtitleTag}
      </div>

      {/* Main Target Word */}
      <h1
        style={{
          margin: 0,
          fontFamily: `${serifFamily}, Georgia, serif`,
          fontSize: 88,
          fontWeight: 700,
          lineHeight: 1.05,
          color: "#F8FAFC",
          letterSpacing: "-0.02em",
          textShadow: `0 0 35px ${colorAccent}55`,
        }}
      >
        {word}
      </h1>

      {/* Badges Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 14,
          opacity: badgeSpring,
          transform: `translateY(${interpolate(badgeSpring, [0, 1], [15, 0])}px)`,
        }}
      >
        <span
          style={{
            fontFamily: `${sansFamily}, sans-serif`,
            fontSize: 22,
            fontWeight: 400,
            color: "#CBD5E1",
            letterSpacing: "0.04em",
          }}
        >
          {phonetic}
        </span>

        <span
          style={{
            fontFamily: `${sansFamily}, sans-serif`,
            fontSize: 14,
            fontWeight: 700,
            color: colorAccent,
            background: `${colorAccent}20`,
            border: `1px solid ${colorAccent}40`,
            padding: "4px 10px",
            borderRadius: 6,
            textTransform: "uppercase",
          }}
        >
          {partOfSpeech}
        </span>
      </div>

      {/* Vietnamese Meaning Pill */}
      {vietnameseMeaning && (
        <div
          style={{
            marginTop: 14,
            fontFamily: `${sansFamily}, sans-serif`,
            fontSize: 20,
            fontWeight: 600,
            color: "#E2E8F0",
            background: "rgba(15, 23, 42, 0.8)",
            padding: "8px 20px",
            borderRadius: 12,
            border: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          🇻🇳 {vietnameseMeaning}
        </div>
      )}
    </div>
  );
};

