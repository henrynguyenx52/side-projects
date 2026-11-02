import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ContrastWordDetail, ComparisonInsight } from "../types";
import { sansFamily, displayFamily } from "../fonts";
import { duoCardStyle } from "../config/design-system";

interface ComparisonSceneProps {
  wordA: ContrastWordDetail;
  wordB: ContrastWordDetail;
  comparison: ComparisonInsight;
}

export const ComparisonScene: React.FC<ComparisonSceneProps> = ({
  wordA,
  wordB,
  comparison,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.5, stiffness: 130 },
  });

  const cardsSpring = spring({
    frame: frame - 8,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 110 },
  });

  const rhymeSpring = spring({
    frame: frame - 22,
    fps,
    config: { damping: 13, mass: 0.5, stiffness: 110 },
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
        padding: "0 50px",
        boxSizing: "border-box",
        gap: 30,
      }}
    >
      {/* 1. Top Header Pill */}
      <div
        style={{
          fontFamily: `${sansFamily}, sans-serif`,
          fontSize: 22,
          fontWeight: 900,
          color: "#FFFFFF",
          background: "#58CC02",
          borderBottom: "5px solid #58A700",
          padding: "10px 36px",
          borderRadius: 9999,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          boxShadow: "0 6px 16px rgba(88, 204, 2, 0.25)",
          transform: `scale(${titleSpring})`,
          opacity: titleSpring,
        }}
      >
        ⚡️ TÓM GỌN CÔNG THỨC VÀNG
      </div>

      {/* 2. Side-by-Side Dual Bento Cards (Duolingo 3D Blocks) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 22,
          width: "100%",
          maxWidth: 960,
          transform: `translateY(${interpolate(cardsSpring, [0, 1], [30, 0])}px)`,
          opacity: cardsSpring,
        }}
      >
        {/* Left Column: SAY (Macaw Blue) */}
        <div
          style={{
            ...duoCardStyle,
            padding: "36px 26px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 16,
            background: "#FFFFFF",
            borderColor: "#DDF4FF",
            borderBottom: "6px solid #1CB0F6",
          }}
        >
          <div
            style={{
              fontFamily: `${displayFamily}, sans-serif`,
              fontSize: 56,
              fontWeight: 900,
              color: "#1CB0F6",
            }}
          >
            SAY
          </div>

          <div
            style={{
              background: "#1CB0F6",
              color: "#FFFFFF",
              borderBottom: "4px solid #1899D6",
              padding: "10px 18px",
              borderRadius: 16,
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 24,
              fontWeight: 900,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            SAY + something
          </div>

          <div
            style={{
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 22,
              fontWeight: 700,
              color: "#4B4B4B",
              lineHeight: 1.4,
            }}
          >
            Nói điều gì đó (Nội dung)
          </div>

          <div
            style={{
              marginTop: "auto",
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 18,
              fontWeight: 800,
              color: "#1899D6",
              background: "#DDF4FF",
              border: "1.5px solid #1CB0F6",
              padding: "8px 16px",
              borderRadius: 12,
            }}
          >
            🚫 Không kèm người nghe
          </div>
        </div>

        {/* Right Column: TELL (Fox Orange) */}
        <div
          style={{
            ...duoCardStyle,
            padding: "36px 26px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 16,
            background: "#FFFFFF",
            borderColor: "#FFEACC",
            borderBottom: "6px solid #FF9600",
          }}
        >
          <div
            style={{
              fontFamily: `${displayFamily}, sans-serif`,
              fontSize: 56,
              fontWeight: 900,
              color: "#FF9600",
            }}
          >
            TELL
          </div>

          <div
            style={{
              background: "#FF9600",
              color: "#FFFFFF",
              borderBottom: "4px solid #E68600",
              padding: "10px 18px",
              borderRadius: 16,
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 24,
              fontWeight: 900,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            TELL + someone
          </div>

          <div
            style={{
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 22,
              fontWeight: 700,
              color: "#4B4B4B",
              lineHeight: 1.4,
            }}
          >
            Nói với ai (Người nhận)
          </div>

          <div
            style={{
              marginTop: "auto",
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 18,
              fontWeight: 800,
              color: "#E68600",
              background: "#FFEACC",
              border: "1.5px solid #FF9600",
              padding: "8px 16px",
              borderRadius: 12,
            }}
          >
            ⚠️ Bắt buộc có người nghe
          </div>
        </div>
      </div>

      {/* 3. Golden Memory Rhyme Banner (Duolingo Tip Card) */}
      <div
        style={{
          ...duoCardStyle,
          width: "100%",
          maxWidth: 960,
          padding: "30px 36px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          background: "#FFF4CC",
          border: "2.5px solid #FFC800",
          borderBottom: "6px solid #E5A500",
          boxShadow: "0 8px 20px rgba(255, 200, 0, 0.2)",
          transform: `scale(${interpolate(rhymeSpring, [0, 1], [0.92, pulse])}) translateY(${interpolate(rhymeSpring, [0, 1], [30, 0])}px)`,
          opacity: rhymeSpring,
        }}
      >
        <div
          style={{
            fontFamily: `${sansFamily}, sans-serif`,
            fontSize: 20,
            fontWeight: 900,
            color: "#E5A500",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>💡 MẸO THẦN CHÚ KHẮC CỐT GHI TÂM</span>
        </div>

        <div
          style={{
            fontFamily: `${displayFamily}, sans-serif`,
            fontSize: 38,
            fontWeight: 900,
            color: "#3C3C3C",
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          "SAY lời muốn nói • TELL người cần nghe!"
        </div>
      </div>
    </div>
  );
};
