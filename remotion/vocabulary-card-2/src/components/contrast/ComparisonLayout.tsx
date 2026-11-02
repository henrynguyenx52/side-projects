import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ContrastWordDetail, ComparisonInsight } from "../../types";
import { sansFamily, serifFamily } from "../../fonts";
import { glassCardStyle } from "../../config/design-system";
import { AnimatedArrow } from "./AnimatedArrow";

interface ComparisonLayoutProps {
  wordA: ContrastWordDetail;
  wordB: ContrastWordDetail;
  comparison: ComparisonInsight;
}

export const ComparisonLayout: React.FC<ComparisonLayoutProps> = ({
  wordA,
  wordB,
  comparison,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardAEntrance = spring({
    frame,
    fps,
    config: { damping: 15, mass: 0.7, stiffness: 85 },
  });

  const cardBEntrance = spring({
    frame: frame - 6,
    fps,
    config: { damping: 15, mass: 0.7, stiffness: 85 },
  });

  const ruleEntrance = spring({
    frame: frame - 14,
    fps,
    config: { damping: 16, mass: 0.8, stiffness: 75 },
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        maxWidth: 960,
        gap: 32,
      }}
    >
      {/* Header Pill */}
      <div
        style={{
          fontFamily: `${sansFamily}, sans-serif`,
          fontSize: 20,
          fontWeight: 800,
          color: "#F8FAFC",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          background: "linear-gradient(90deg, #38BDF8 0%, #34D399 100%)",
          padding: "8px 28px",
          borderRadius: 9999,
          boxShadow: "0 0 30px rgba(56, 189, 248, 0.4)",
        }}
      >
        {comparison.headline}
      </div>

      {/* Side-by-Side Dual Comparison Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          width: "100%",
        }}
      >
        {/* Word A Column */}
        <div
          style={{
            ...glassCardStyle,
            padding: "32px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            borderTop: `6px solid ${wordA.colorAccent || "#38BDF8"}`,
            transform: `translateY(${interpolate(cardAEntrance, [0, 1], [40, 0])}px)`,
            opacity: cardAEntrance,
          }}
        >
          <div
            style={{
              fontFamily: `${serifFamily}, Georgia, serif`,
              fontSize: 52,
              fontWeight: 700,
              color: wordA.colorAccent || "#38BDF8",
            }}
          >
            {wordA.word}
          </div>

          <AnimatedArrow
            direction={wordA.direction}
            label={wordA.directionLabel}
            color={wordA.colorAccent || "#38BDF8"}
          />

          <div
            style={{
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 20,
              color: "#CBD5E1",
              fontWeight: 500,
              lineHeight: 1.4,
              marginTop: 8,
            }}
          >
            {comparison.ruleA}
          </div>
        </div>

        {/* Word B Column */}
        <div
          style={{
            ...glassCardStyle,
            padding: "32px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            borderTop: `6px solid ${wordB.colorAccent || "#34D399"}`,
            transform: `translateY(${interpolate(cardBEntrance, [0, 1], [40, 0])}px)`,
            opacity: cardBEntrance,
          }}
        >
          <div
            style={{
              fontFamily: `${serifFamily}, Georgia, serif`,
              fontSize: 52,
              fontWeight: 700,
              color: wordB.colorAccent || "#34D399",
            }}
          >
            {wordB.word}
          </div>

          <AnimatedArrow
            direction={wordB.direction}
            label={wordB.directionLabel}
            color={wordB.colorAccent || "#34D399"}
          />

          <div
            style={{
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 20,
              color: "#CBD5E1",
              fontWeight: 500,
              lineHeight: 1.4,
              marginTop: 8,
            }}
          >
            {comparison.ruleB}
          </div>
        </div>
      </div>

      {/* Memory Trick Banner */}
      <div
        style={{
          ...glassCardStyle,
          width: "100%",
          padding: "24px 32px",
          background: "rgba(15, 23, 42, 0.85)",
          border: "1px solid rgba(245, 158, 11, 0.4)",
          boxShadow: "0 10px 30px rgba(245, 158, 11, 0.15)",
          display: "flex",
          alignItems: "center",
          gap: 18,
          transform: `translateY(${interpolate(ruleEntrance, [0, 1], [30, 0])}px)`,
          opacity: ruleEntrance,
        }}
      >
        <span style={{ fontSize: 36 }}>🧠</span>
        <div>
          <div
            style={{
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 16,
              fontWeight: 700,
              color: "#F59E0B",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 4,
            }}
          >
            Memory Hack
          </div>
          <div
            style={{
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 24,
              fontWeight: 600,
              color: "#F8FAFC",
              lineHeight: 1.35,
            }}
          >
            {comparison.memoryTrick}
          </div>
        </div>
      </div>
    </div>
  );
};

