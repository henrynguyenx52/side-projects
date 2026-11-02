import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { QuizDetail } from "../../types";
import { sansFamily, displayFamily } from "../../fonts";
import { duoCardStyle } from "../../config/design-system";

interface QuizCardProps {
  quiz: QuizDetail;
  revealFrameOffset?: number;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  quiz,
  revealFrameOffset = 183, // right when narrator says "Đáp án là TELL!" at 6.1s
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.5, stiffness: 130 },
  });

  const isRevealed = frame >= revealFrameOffset;

  const revealSpring = spring({
    frame: frame - revealFrameOffset,
    fps,
    config: { damping: 12, mass: 0.5, stiffness: 140 },
  });

  // Countdown timer frames: starts around frame 126 and counts 5, 4, 3, 2, 1 until reveal at 183
  const countdownStart = 126;

  let countdownText = "5";
  if (frame >= countdownStart + 44) {
    countdownText = "1";
  } else if (frame >= countdownStart + 34) {
    countdownText = "2";
  } else if (frame >= countdownStart + 24) {
    countdownText = "3";
  } else if (frame >= countdownStart + 10) {
    countdownText = "4";
  }

  const timerPulse = Math.sin((frame / fps) * Math.PI * 4) * 0.06 + 1;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        maxWidth: 960,
        gap: 28,
        transform: `translateY(${interpolate(entrance, [0, 1], [30, 0])}px)`,
        opacity: entrance,
      }}
    >
      {/* 1. Quiz Header Pill */}
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
        }}
      >
        ⚡️ KIỂM TRA HIỂU BÀI • THỬ THÁCH 5 GIÂY
      </div>

      {/* 2. Question Card (Duolingo Dialogue Card) */}
      <div
        style={{
          ...duoCardStyle,
          width: "100%",
          padding: "44px 40px",
          textAlign: "center",
          boxSizing: "border-box",
          borderBottom: "6px solid #DCDCDC",
        }}
      >
        <div
          style={{
            fontFamily: `${displayFamily}, sans-serif`,
            fontSize: 42,
            fontWeight: 800,
            color: "#3C3C3C",
            lineHeight: 1.4,
          }}
        >
          "Did she{" "}
          <span
            style={{
              display: "inline-block",
              background: isRevealed ? "#D7FFB8" : "#F4F6F8",
              color: isRevealed ? "#58CC02" : "#AFAFAF",
              border: `2.5px ${isRevealed ? "solid #58CC02" : "dashed #DCDCDC"}`,
              borderBottom: isRevealed ? "5px solid #58A700" : "4px dashed #DCDCDC",
              padding: "4px 24px",
              borderRadius: 16,
              fontWeight: 900,
              boxShadow: isRevealed ? "0 4px 12px rgba(88, 204, 2, 0.25)" : "none",
            }}
          >
            {isRevealed ? "TELL" : "_____"}
          </span>{" "}
          <span
            style={{
              color: "#1CB0F6",
              backgroundColor: "#DDF4FF",
              padding: "2px 14px",
              borderRadius: 10,
              borderBottom: "3px solid #1899D6",
              fontWeight: 900,
            }}
          >
            you
          </span>{" "}
          what happened yesterday?"
        </div>
      </div>

      {/* 3. Countdown Bar / Timer */}
      {!isRevealed && frame >= countdownStart && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: "#FFF4CC",
            border: "2px solid #FFC800",
            borderBottom: "4px solid #E5A500",
            padding: "8px 26px",
            borderRadius: 9999,
            transform: `scale(${timerPulse})`,
          }}
        >
          <span style={{ fontSize: 24 }}>⏳</span>
          <span
            style={{
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 22,
              fontWeight: 900,
              color: "#E5A500",
              letterSpacing: "0.08em",
            }}
          >
            SUY NGHĨ NHANH: {countdownText} GIÂY...
          </span>
        </div>
      )}

      {/* 4. Options Grid (Duolingo 3D Choice Buttons) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          width: "100%",
        }}
      >
        {/* Option A: SAY */}
        <div
          style={{
            ...duoCardStyle,
            padding: "26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            background: isRevealed ? "#FFDFE0" : "#FFFFFF",
            border: isRevealed ? "2.5px solid #FF4B4B" : "2.5px solid #E5E5E5",
            borderBottom: isRevealed ? "6px solid #EA2B2B" : "6px solid #DCDCDC",
            opacity: isRevealed ? 0.6 : 1,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              fontFamily: `${displayFamily}, sans-serif`,
              fontSize: 34,
              fontWeight: 900,
              color: isRevealed ? "#FF4B4B" : "#1CB0F6",
            }}
          >
            [ A ] SAY {isRevealed && "❌"}
          </span>
        </div>

        {/* Option B: TELL (Winner) */}
        <div
          style={{
            ...duoCardStyle,
            padding: "26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            background: isRevealed ? "#58CC02" : "#FFFFFF",
            border: isRevealed ? "2.5px solid #58CC02" : "2.5px solid #E5E5E5",
            borderBottom: isRevealed ? "6px solid #58A700" : "6px solid #DCDCDC",
            boxShadow: isRevealed ? "0 8px 24px rgba(88, 204, 2, 0.35)" : "0 8px 24px rgba(0, 0, 0, 0.05)",
            transform: isRevealed
              ? `scale(${interpolate(revealSpring, [0, 1], [0.95, 1.03])})`
              : "none",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              fontFamily: `${displayFamily}, sans-serif`,
              fontSize: 34,
              fontWeight: 900,
              color: isRevealed ? "#FFFFFF" : "#FF9600",
            }}
          >
            [ B ] TELL {isRevealed && "✅"}
          </span>
        </div>
      </div>

      {/* 5. Duolingo Correct Answer Bottom Sheet Banner */}
      {isRevealed && (
        <div
          style={{
            ...duoCardStyle,
            width: "100%",
            padding: "26px 36px",
            background: "#D7FFB8",
            border: "2.5px solid #58CC02",
            borderBottom: "6px solid #58A700",
            textAlign: "center",
            transform: `scale(${revealSpring})`,
            opacity: revealSpring,
            boxShadow: "0 10px 30px rgba(88, 204, 2, 0.25)",
          }}
        >
          <div
            style={{
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 28,
              fontWeight: 900,
              color: "#58A700",
              marginBottom: 6,
              letterSpacing: "0.05em",
            }}
          >
            🎉 CHÍNH XÁC! (EXCELLENT!)
          </div>
          <div
            style={{
              fontFamily: `${sansFamily}, sans-serif`,
              fontSize: 24,
              fontWeight: 700,
              color: "#3C3C3C",
            }}
          >
            Vì ngay phía sau có{" "}
            <span
              style={{
                background: "#1CB0F6",
                color: "#FFFFFF",
                padding: "2px 12px",
                borderRadius: 8,
                fontWeight: 900,
              }}
            >
              YOU
            </span>
            , chính là người nhận thông tin! Dễ chưa? 😎
          </div>
        </div>
      )}
    </div>
  );
};
