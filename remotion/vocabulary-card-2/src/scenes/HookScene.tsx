import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ContrastWordDetail } from "../types";
import { sansFamily, displayFamily } from "../fonts";
import { duoCardStyle } from "../config/design-system";

interface HookSceneProps {
  wordA: ContrastWordDetail;
  wordB: ContrastWordDetail;
}

export const HookScene: React.FC<HookSceneProps> = ({ wordA, wordB }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance animations
  const badgeSpring = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.5, stiffness: 130 },
  });

  const cardSpring = spring({
    frame: frame - 6,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 110 },
  });

  const strikeSpring = spring({
    frame: frame - 20,
    fps,
    config: { damping: 12, mass: 0.4, stiffness: 140 },
  });

  const vsCardSpring = spring({
    frame: frame - 32,
    fps,
    config: { damping: 14, mass: 0.7, stiffness: 100 },
  });

  const strikeWidth = interpolate(strikeSpring, [0, 1], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: "0 54px",
        boxSizing: "border-box",
        textAlign: "center",
        gap: 34,
      }}
    >
      {/* 1. Header Alert Pill (Duolingo 3D Pill) */}
      <div
        style={{
          fontFamily: `${sansFamily}, sans-serif`,
          fontSize: 22,
          fontWeight: 900,
          color: "#FF4B4B",
          background: "#FFDFE0",
          border: "2px solid #FF4B4B",
          borderBottom: "5px solid #EA2B2B",
          padding: "10px 32px",
          borderRadius: 9999,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          boxShadow: "0 6px 16px rgba(255, 75, 75, 0.15)",
          transform: `scale(${badgeSpring})`,
          opacity: badgeSpring,
        }}
      >
        🚨 CẢNH BÁO • TRỪ ĐIỂM OAN
      </div>

      {/* 2. Big Strike-through Mistake Hero Card */}
      <div
        style={{
          ...duoCardStyle,
          width: "100%",
          maxWidth: 960,
          padding: "44px 40px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
          borderColor: "#FFDFE0",
          borderBottom: "6px solid #FF4B4B",
          transform: `scale(${interpolate(cardSpring, [0, 1], [0.9, 1])}) translateY(${interpolate(cardSpring, [0, 1], [40, 0])}px)`,
          opacity: cardSpring,
        }}
      >
        <div
          style={{
            fontFamily: `${sansFamily}, sans-serif`,
            fontSize: 24,
            fontWeight: 800,
            color: "#777777",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Nếu em từng nói câu này... 😭
        </div>

        {/* The Bad Phrase with animated red strike-through */}
        <div style={{ position: "relative", display: "inline-block", margin: "10px 0" }}>
          <span
            style={{
              fontFamily: `${displayFamily}, sans-serif`,
              fontSize: 84,
              fontWeight: 900,
              color: "#3C3C3C",
              letterSpacing: "-0.02em",
            }}
          >
            "HE SAID ME"
          </span>
          {/* Animated red strike line */}
          <div
            style={{
              position: "absolute",
              top: "52%",
              left: 0,
              width: `${strikeWidth}%`,
              height: 12,
              backgroundColor: "#FF4B4B",
              borderRadius: 6,
              transform: "rotate(-3deg)",
              boxShadow: "0 4px 10px rgba(255, 75, 75, 0.35)",
            }}
          />
        </div>

        <div
          style={{
            fontFamily: `${sansFamily}, sans-serif`,
            fontSize: 26,
            fontWeight: 700,
            color: "#4B4B4B",
          }}
        >
          Đừng nói <span style={{ color: "#FF4B4B", fontWeight: 900 }}>HE SAID ME</span> nữa nhé!
        </div>
      </div>

      {/* 3. Hero Solution Card: SAY vs TELL (Duolingo Style) */}
      <div
        style={{
          ...duoCardStyle,
          width: "100%",
          maxWidth: 960,
          padding: "36px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
          borderBottom: "6px solid #58CC02",
          transform: `scale(${interpolate(vsCardSpring, [0, 1], [0.92, 1])}) translateY(${interpolate(vsCardSpring, [0, 1], [30, 0])}px)`,
          opacity: vsCardSpring,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          {/* SAY Badge */}
          <div
            style={{
              background: "#1CB0F6",
              borderBottom: "5px solid #1899D6",
              borderRadius: 20,
              padding: "10px 36px",
              boxShadow: "0 4px 12px rgba(28, 176, 246, 0.25)",
            }}
          >
            <span
              style={{
                fontFamily: `${displayFamily}, sans-serif`,
                fontSize: 68,
                fontWeight: 900,
                color: "#FFFFFF",
              }}
            >
              {wordA.word.toUpperCase()}
            </span>
          </div>

          {/* VS Tag */}
          <div
            style={{
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 24,
              fontWeight: 900,
              color: "#FFFFFF",
              backgroundColor: "#FFC800",
              borderBottom: "4px solid #E5A500",
              padding: "6px 18px",
              borderRadius: 9999,
            }}
          >
            VS
          </div>

          {/* TELL Badge */}
          <div
            style={{
              background: "#FF9600",
              borderBottom: "5px solid #E68600",
              borderRadius: 20,
              padding: "10px 36px",
              boxShadow: "0 4px 12px rgba(255, 150, 0, 0.25)",
            }}
          >
            <span
              style={{
                fontFamily: `${displayFamily}, sans-serif`,
                fontSize: 68,
                fontWeight: 900,
                color: "#FFFFFF",
              }}
            >
              {wordB.word.toUpperCase()}
            </span>
          </div>
        </div>

        <div
          style={{
            fontFamily: `${sansFamily}, sans-serif`,
            fontSize: 24,
            fontWeight: 800,
            color: "#58CC02",
            background: "#D7FFB8",
            border: "1.5px solid #58CC02",
            borderBottom: "3px solid #58A700",
            padding: "8px 28px",
            borderRadius: 9999,
          }}
        >
          ✨ PHÂN BIỆT RÕ RÀNG TRONG 40 GIÂY
        </div>
      </div>
    </div>
  );
};
