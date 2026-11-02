import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { sansFamily } from "../../fonts";
import { glassCardStyle } from "../../config/design-system";

interface DefinitionCardProps {
  definition: string;
  explanation: string;
  collocations?: string[];
  colorAccent: string;
}

export const DefinitionCard: React.FC<DefinitionCardProps> = ({
  definition,
  explanation,
  collocations,
  colorAccent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardEntrance = spring({
    frame: frame - 6,
    fps,
    config: { damping: 16, mass: 0.8, stiffness: 75 },
  });

  const translateY = interpolate(cardEntrance, [0, 1], [40, 0]);
  const opacity = interpolate(cardEntrance, [0, 1], [0, 1]);

  return (
    <div
      style={{
        ...glassCardStyle,
        width: "100%",
        maxWidth: 920,
        padding: "36px 44px",
        boxSizing: "border-box",
        borderLeft: `6px solid ${colorAccent}`,
        transform: `translateY(${translateY}px)`,
        opacity,
      }}
    >
      {/* Definition Label */}
      <div
        style={{
          fontFamily: `${sansFamily}, sans-serif`,
          fontSize: 16,
          fontWeight: 700,
          color: colorAccent,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          marginBottom: 12,
        }}
      >
        Definition & Meaning
      </div>

      {/* Main Definition Text */}
      <div
        style={{
          fontFamily: `${sansFamily}, sans-serif`,
          fontSize: 32,
          fontWeight: 600,
          lineHeight: 1.45,
          color: "#F8FAFC",
          marginBottom: 20,
        }}
      >
        "{definition}"
      </div>

      {/* Nuance explanation */}
      <div
        style={{
          fontFamily: `${sansFamily}, sans-serif`,
          fontSize: 22,
          fontWeight: 400,
          color: "#94A3B8",
          lineHeight: 1.5,
          marginBottom: collocations && collocations.length > 0 ? 20 : 0,
        }}
      >
        💡 {explanation}
      </div>

      {/* Key Collocations Chips */}
      {collocations && collocations.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {collocations.map((colloc, idx) => (
            <span
              key={idx}
              style={{
                fontFamily: `${sansFamily}, sans-serif`,
                fontSize: 18,
                fontWeight: 600,
                color: "#E2E8F0",
                background: "rgba(255, 255, 255, 0.06)",
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              🔹 {colloc}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

