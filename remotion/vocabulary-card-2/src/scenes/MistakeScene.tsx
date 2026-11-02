import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CommonMistakeDetail } from "../types";
import { sansFamily, displayFamily } from "../fonts";
import { duoCardStyle } from "../config/design-system";

interface MistakeSceneProps {
  mistake: CommonMistakeDetail;
}

export const MistakeScene: React.FC<MistakeSceneProps> = ({ mistake }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.5, stiffness: 130 },
  });

  const wrongCardSpring = spring({
    frame: frame - 6,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 110 },
  });

  const rightCardSpring = spring({
    frame: frame - 20,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 110 },
  });

  const altCardSpring = spring({
    frame: frame - 35,
    fps,
    config: { damping: 15, mass: 0.7, stiffness: 100 },
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
        padding: "0 50px",
        boxSizing: "border-box",
        gap: 24,
      }}
    >
      {/* 1. Header Alert Pill */}
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
          transform: `scale(${titleSpring})`,
          opacity: titleSpring,
        }}
      >
        🚫 LỖI SAI RẤT NHIỀU NGƯỜI MẮC
      </div>

      {/* 2. Wrong Sentence Card (Duolingo Mistake Style) */}
      <div
        style={{
          ...duoCardStyle,
          width: "100%",
          maxWidth: 960,
          padding: "26px 34px",
          display: "flex",
          alignItems: "center",
          gap: 24,
          background: "#FFDFE0",
          border: "2.5px solid #FF4B4B",
          borderBottom: "6px solid #EA2B2B",
          transform: `translateY(${interpolate(wrongCardSpring, [0, 1], [30, 0])}px)`,
          opacity: wrongCardSpring,
        }}
      >
        <div
          style={{
            fontSize: 40,
            minWidth: 64,
            height: 64,
            borderRadius: "50%",
            background: "#FFFFFF",
            border: "2px solid #FF4B4B",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ❌
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 18,
              fontWeight: 900,
              color: "#EA2B2B",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            ĐỪNG NÓI THẾ NÀY (SAI NGỮ PHÁP 🥴)
          </div>
          <div
            style={{
              fontFamily: `${displayFamily}, sans-serif`,
              fontSize: 34,
              fontWeight: 900,
              color: "#3C3C3C",
              textDecoration: "line-through",
              textDecorationColor: "#FF4B4B",
            }}
          >
            "He <span style={{ color: "#FF4B4B" }}>said me</span> that he was busy."
          </div>
        </div>
      </div>

      {/* 3. Correct Sentence Card (Duolingo Success Style) */}
      <div
        style={{
          ...duoCardStyle,
          width: "100%",
          maxWidth: 960,
          padding: "26px 34px",
          display: "flex",
          alignItems: "center",
          gap: 24,
          background: "#D7FFB8",
          border: "2.5px solid #58CC02",
          borderBottom: "6px solid #58A700",
          transform: `translateY(${interpolate(rightCardSpring, [0, 1], [30, 0])}px)`,
          opacity: rightCardSpring,
        }}
      >
        <div
          style={{
            fontSize: 40,
            minWidth: 64,
            height: 64,
            borderRadius: "50%",
            background: "#FFFFFF",
            border: "2px solid #58CC02",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✅
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 18,
              fontWeight: 900,
              color: "#58A700",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            PHẢI LÀ THẾ NÀY (CHUẨN 100% 👍)
          </div>
          <div
            style={{
              fontFamily: `${displayFamily}, sans-serif`,
              fontSize: 34,
              fontWeight: 900,
              color: "#3C3C3C",
            }}
          >
            "He{" "}
            <span
              style={{
                color: "#FFFFFF",
                backgroundColor: "#58CC02",
                borderBottom: "4px solid #58A700",
                padding: "2px 14px",
                borderRadius: 12,
                display: "inline-block",
              }}
            >
              told me
            </span>{" "}
            that he was busy."
          </div>
        </div>
      </div>

      {/* 4. Alternative Say Sentence Card */}
      <div
        style={{
          ...duoCardStyle,
          width: "100%",
          maxWidth: 960,
          padding: "24px 34px",
          display: "flex",
          alignItems: "center",
          gap: 24,
          background: "#DDF4FF",
          border: "2.5px solid #1CB0F6",
          borderBottom: "6px solid #1899D6",
          transform: `translateY(${interpolate(altCardSpring, [0, 1], [30, 0])}px)`,
          opacity: altCardSpring,
        }}
      >
        <div
          style={{
            fontSize: 36,
            minWidth: 64,
            height: 64,
            borderRadius: "50%",
            background: "#FFFFFF",
            border: "2px solid #1CB0F6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          💡
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 18,
              fontWeight: 900,
              color: "#1899D6",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            HOẶC NẾU MUỐN DÙNG SAY:
          </div>
          <div
            style={{
              fontFamily: `${displayFamily}, sans-serif`,
              fontSize: 30,
              fontWeight: 800,
              color: "#3C3C3C",
            }}
          >
            "He said that he was busy{" "}
            <span
              style={{
                color: "#FFFFFF",
                backgroundColor: "#1CB0F6",
                borderBottom: "3px solid #1899D6",
                padding: "2px 12px",
                borderRadius: 10,
                display: "inline-block",
              }}
            >
              TO me
            </span>
            ."
          </div>
        </div>
      </div>

      {/* 5. Bottom Punchline Warning Badge */}
      <div
        style={{
          marginTop: 8,
          fontFamily: `${sansFamily}, sans-serif`,
          fontSize: 22,
          fontWeight: 900,
          color: "#FF4B4B",
          background: "#FFFFFF",
          border: "2px solid #FF4B4B",
          borderBottom: "5px solid #EA2B2B",
          padding: "10px 32px",
          borderRadius: 9999,
          letterSpacing: "0.06em",
          boxShadow: "0 4px 12px rgba(255, 75, 75, 0.12)",
        }}
      >
        ⚠️ Nhớ nhé: Không bao giờ có chuyện "SAID ME" đâu!
      </div>
    </div>
  );
};
