import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ContrastWordDetail } from "../types";
import { sansFamily, displayFamily } from "../fonts";
import { duoCardStyle } from "../config/design-system";

interface CTASceneProps {
  wordA: ContrastWordDetail;
  wordB: ContrastWordDetail;
  ctaText?: string;
  homework?: {
    question: string;
    options: string[];
    instruction?: string;
    note?: string;
  };
}

export const CTAScene: React.FC<CTASceneProps> = ({
  wordA,
  wordB,
  ctaText = "Follow anh để mỗi ngày giỏi tiếng Anh hơn! ❤️",
  homework,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.5, stiffness: 130 },
  });

  const questionCardSpring = spring({
    frame: frame - 8,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 110 },
  });

  const buttonSpring = spring({
    frame: frame - 18,
    fps,
    config: { damping: 12, mass: 0.5, stiffness: 120 },
  });

  const pulse = Math.sin((frame / fps) * Math.PI * 2) * 0.03 + 1;

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
        gap: 28,
      }}
    >
      {/* 1. Header Pill */}
      <div
        style={{
          fontFamily: `${sansFamily}, sans-serif`,
          fontSize: 22,
          fontWeight: 900,
          color: "#E5A500",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          background: "#FFF4CC",
          border: "2px solid #FFC800",
          borderBottom: "5px solid #E5A500",
          padding: "10px 32px",
          borderRadius: 9999,
          boxShadow: "0 6px 16px rgba(255, 200, 0, 0.2)",
          transform: `scale(${entrance})`,
          opacity: entrance,
        }}
      >
        🎯 BÀI TẬP VỀ NHÀ • THỬ TÀI CỦA EM
      </div>

      {/* 2. Interactive Question Card (Duolingo Style) */}
      {homework ? (
        <div
          style={{
            ...duoCardStyle,
            width: "100%",
            maxWidth: 960,
            padding: "40px 36px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            borderBottom: "6px solid #58CC02",
            transform: `translateY(${interpolate(questionCardSpring, [0, 1], [30, 0])}px)`,
            opacity: questionCardSpring,
          }}
        >
          <div
            style={{
              fontFamily: `${displayFamily}, sans-serif`,
              fontSize: 48,
              fontWeight: 900,
              color: "#3C3C3C",
              lineHeight: 1.35,
            }}
          >
            "{homework.question}"
          </div>

          {/* Options A & B (Duolingo 3D Blocks) */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 24,
              width: "100%",
            }}
          >
            {homework.options.map((opt, idx) => {
              const isOptionA = idx === 0;
              const color = isOptionA ? "#1CB0F6" : "#FF9600";
              const darkColor = isOptionA ? "#1899D6" : "#E68600";
              const lightBg = isOptionA ? "#DDF4FF" : "#FFEACC";
              return (
                <div
                  key={opt}
                  style={{
                    flex: 1,
                    maxWidth: 320,
                    padding: "18px 24px",
                    borderRadius: 20,
                    background: lightBg,
                    border: `2.5px solid ${color}`,
                    borderBottom: `6px solid ${darkColor}`,
                    fontFamily: `${displayFamily}, sans-serif`,
                    fontSize: 42,
                    fontWeight: 900,
                    color: color,
                    boxShadow: "0 6px 16px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  {opt}
                </div>
              );
            })}
          </div>

          {/* Prompt / Instruction */}
          <div
            style={{
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 26,
              fontWeight: 800,
              color: "#58CC02",
              background: "#D7FFB8",
              border: "1.5px solid #58CC02",
              borderBottom: "4px solid #58A700",
              padding: "10px 28px",
              borderRadius: 16,
            }}
          >
            {homework.instruction || "💬 Comment đáp án bên dưới cho anh biết nhé!"}
          </div>
        </div>
      ) : (
        /* Fallback Summary Card */
        <div
          style={{
            ...duoCardStyle,
            width: "100%",
            maxWidth: 960,
            padding: "40px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            transform: `translateY(${interpolate(entrance, [0, 1], [30, 0])}px)`,
            opacity: entrance,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <span style={{ fontFamily: `${displayFamily}, sans-serif`, fontSize: 64, fontWeight: 900, color: "#1CB0F6" }}>
              SAY
            </span>
            <span style={{ fontFamily: `${sansFamily}, sans-serif`, fontSize: 26, fontWeight: 900, color: "#777777" }}>
              &
            </span>
            <span style={{ fontFamily: `${displayFamily}, sans-serif`, fontSize: 64, fontWeight: 900, color: "#FF9600" }}>
              TELL
            </span>
          </div>
          <div
            style={{
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 26,
              fontWeight: 800,
              color: "#58CC02",
              background: "#D7FFB8",
              border: "1.5px solid #58CC02",
              borderBottom: "4px solid #58A700",
              padding: "8px 24px",
              borderRadius: 14,
            }}
          >
            SAY lời muốn nói • TELL người cần nghe!
          </div>
        </div>
      )}

      {/* 3. Follow & Interaction Banner */}
      <div
        style={{
          ...duoCardStyle,
          width: "100%",
          maxWidth: 960,
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          background: "#FFFFFF",
          border: "2.5px solid #FFC800",
          borderBottom: "6px solid #E5A500",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
          transform: `scale(${interpolate(buttonSpring, [0, 1], [0.94, pulse])}) translateY(${interpolate(buttonSpring, [0, 1], [20, 0])}px)`,
          opacity: buttonSpring,
        }}
      >
        <div
          style={{
            fontFamily: `${displayFamily}, sans-serif`,
            fontSize: 30,
            fontWeight: 900,
            color: "#3C3C3C",
            lineHeight: 1.3,
          }}
        >
          {homework?.note || "👀 Cấm nhìn trộm đáp án người khác đấy nhé!"}
        </div>

        {/* 3D Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 4,
          }}
        >
          <div
            style={{
              background: "#58CC02",
              borderBottom: "5px solid #58A700",
              color: "#FFFFFF",
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 20,
              fontWeight: 900,
              padding: "10px 28px",
              borderRadius: 18,
              boxShadow: "0 6px 14px rgba(88, 204, 2, 0.25)",
              cursor: "pointer",
            }}
          >
            💬 Để lại Comment ngay
          </div>

          <div
            style={{
              background: "#1CB0F6",
              borderBottom: "5px solid #1899D6",
              color: "#FFFFFF",
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 20,
              fontWeight: 900,
              padding: "10px 28px",
              borderRadius: 18,
              boxShadow: "0 6px 14px rgba(28, 176, 246, 0.25)",
              cursor: "pointer",
            }}
          >
            ➕ Follow để xem giải thích
          </div>
        </div>
      </div>
    </div>
  );
};
