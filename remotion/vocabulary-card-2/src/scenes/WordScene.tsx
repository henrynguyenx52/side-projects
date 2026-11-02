import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ContrastWordDetail } from "../types";
import { sansFamily, displayFamily } from "../fonts";
import { duoCardStyle } from "../config/design-system";

interface WordSceneProps {
  wordDetail: ContrastWordDetail;
  stepNumber: number;
}

export const WordScene: React.FC<WordSceneProps> = ({
  wordDetail,
  stepNumber,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isSay = wordDetail.word.toLowerCase() === "say";
  const accentColor = isSay ? "#1CB0F6" : "#FF9600";
  const darkBorderColor = isSay ? "#1899D6" : "#E68600";
  const lightBgColor = isSay ? "#DDF4FF" : "#FFEACC";

  // Animations
  const headerSpring = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.5, stiffness: 130 },
  });

  const ruleCardSpring = spring({
    frame: frame - 8,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 110 },
  });

  const exampleCardSpring = spring({
    frame: frame - 18,
    fps,
    config: { damping: 14, mass: 0.7, stiffness: 100 },
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
        gap: 30,
      }}
    >
      {/* 1. Step Pill Badge */}
      <div
        style={{
          fontFamily: `${sansFamily}, sans-serif`,
          fontSize: 22,
          fontWeight: 900,
          color: accentColor,
          background: lightBgColor,
          border: `2px solid ${accentColor}`,
          borderBottom: `4px solid ${darkBorderColor}`,
          padding: "10px 32px",
          borderRadius: 9999,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          boxShadow: "0 6px 14px rgba(0, 0, 0, 0.05)",
          transform: `scale(${headerSpring})`,
          opacity: headerSpring,
        }}
      >
        {isSay ? "BƯỚC 1 • BẢN CHẤT CỦA SAY" : "BƯỚC 2 • BẢN CHẤT CỦA TELL"}
      </div>

      {/* 2. Hero Word & Concept Definition Card */}
      <div
        style={{
          ...duoCardStyle,
          width: "100%",
          maxWidth: 960,
          padding: "38px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
          borderBottom: `6px solid ${darkBorderColor}`,
          transform: `translateY(${interpolate(ruleCardSpring, [0, 1], [35, 0])}px)`,
          opacity: ruleCardSpring,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <span
            style={{
              fontFamily: `${displayFamily}, sans-serif`,
              fontSize: 88,
              fontWeight: 900,
              lineHeight: 1,
              color: accentColor,
            }}
          >
            {wordDetail.word.toUpperCase()}
          </span>
          <span
            style={{
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 30,
              fontWeight: 700,
              color: "#777777",
              background: "#F4F6F8",
              padding: "4px 16px",
              borderRadius: 12,
              border: "1.5px solid #E5E5E5",
            }}
          >
            {wordDetail.pronunciation}
          </span>
        </div>

        {/* Big Tactile Focus Banner */}
        <div
          style={{
            fontFamily: `${sansFamily}, sans-serif`,
            fontSize: 34,
            fontWeight: 900,
            color: "#FFFFFF",
            background: accentColor,
            borderBottom: `5px solid ${darkBorderColor}`,
            padding: "14px 40px",
            borderRadius: 20,
            letterSpacing: "0.02em",
            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.08)",
          }}
        >
          {isSay ? "SAY = Nói điều gì? (Nội dung)" : "TELL = Nói với ai? (Người nhận)"}
        </div>

        {/* Core Formula Box */}
        <div
          style={{
            background: lightBgColor,
            border: `2px dashed ${accentColor}`,
            borderRadius: 20,
            padding: "20px 32px",
            width: "100%",
            boxSizing: "border-box",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 32,
              fontWeight: 900,
              color: "#3C3C3C",
              marginBottom: 8,
            }}
          >
            {isSay ? "👉 SAY + Điều muốn nói" : "👉 TELL + Người nhận + Thông tin"}
          </div>
          <div
            style={{
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 22,
              fontWeight: 700,
              color: isSay ? "#1899D6" : "#E68600",
            }}
          >
            {isSay
              ? "🚫 Không cần gọi tên người nghe ngay phía sau!"
              : "⚠️ Bắt buộc phải có người nghe ngay sau động từ!"}
          </div>
        </div>
      </div>

      {/* 3. Real Example Sentence Bento Card (Duolingo Speech Bubble Style) */}
      <div
        style={{
          ...duoCardStyle,
          width: "100%",
          maxWidth: 960,
          padding: "34px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          borderBottom: "6px solid #58CC02",
          transform: `translateY(${interpolate(exampleCardSpring, [0, 1], [35, 0])}px)`,
          opacity: exampleCardSpring,
        }}
      >
        <div
          style={{
            fontFamily: `${sansFamily}, sans-serif`,
            fontSize: 18,
            fontWeight: 900,
            color: "#58CC02",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>💬 VÍ DỤ MINH HỌA</span>
        </div>

        {/* Main English Example */}
        <div
          style={{
            fontFamily: `${displayFamily}, sans-serif`,
            fontSize: 40,
            fontWeight: 800,
            color: "#3C3C3C",
            lineHeight: 1.3,
          }}
        >
          {isSay ? (
            <>
              He{" "}
              <span
                style={{
                  color: "#FFFFFF",
                  backgroundColor: accentColor,
                  borderBottom: `4px solid ${darkBorderColor}`,
                  padding: "4px 18px",
                  borderRadius: 14,
                  display: "inline-block",
                }}
              >
                said
              </span>{" "}
              he was tired.
            </>
          ) : (
            <>
              She{" "}
              <span
                style={{
                  color: "#FFFFFF",
                  backgroundColor: accentColor,
                  borderBottom: `4px solid ${darkBorderColor}`,
                  padding: "4px 18px",
                  borderRadius: 14,
                  display: "inline-block",
                }}
              >
                told
              </span>{" "}
              <span
                style={{
                  background: "#D7FFB8",
                  color: "#58CC02",
                  padding: "4px 18px",
                  borderRadius: 14,
                  border: "2px solid #58CC02",
                  borderBottom: "4px solid #58A700",
                  display: "inline-block",
                  fontWeight: 900,
                }}
              >
                me
              </span>{" "}
              a secret.
            </>
          )}
        </div>

        {/* Vietnamese Translation */}
        <div
          style={{
            fontFamily: `${sansFamily}, sans-serif`,
            fontSize: 24,
            fontWeight: 600,
            color: "#777777",
          }}
        >
          {isSay
            ? '→ "Anh ấy nói rằng anh ấy mệt."'
            : '→ "Cô ấy kể cho tôi một bí mật."'}
        </div>
      </div>
    </div>
  );
};
