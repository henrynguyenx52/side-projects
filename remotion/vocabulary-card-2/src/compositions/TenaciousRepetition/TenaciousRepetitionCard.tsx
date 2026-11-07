import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// 6 repetition words with Chatterbox am_liam voice @ natural 1.0x speed + tock sound right after pronunciation
// Beats @ 30fps (Word start -> Tock frame):
// #1: 0.15s (frame 4)   -> tock 0.82s (frame 25)
// #2: 0.84s (frame 25)  -> tock 1.51s (frame 45)
// #3: 1.53s (frame 46)  -> tock 2.20s (frame 66)
// #4: 2.22s (frame 67)  -> tock 2.89s (frame 87)
// #5: 2.91s (frame 87)  -> tock 3.58s (frame 107)
// #6: 3.60s (frame 108) -> tock 4.27s (frame 128)
const REPEAT_WORDS = [
  // Top row
  { text: "tenacious", x: 250, y: 230, rotation: -6, size: 56, weight: 900, outline: false, beatFrame: 4, tockFrame: 25, color: "#FFFFFF" },
  { text: "tenacious", x: 840, y: 220, rotation: 7, size: 56, weight: 900, outline: true, beatFrame: 25, tockFrame: 45, color: "#F97316" },

  // Left & Right sides of image (image spans left 210 -> right 870)
  { text: "tenacious", x: 120, y: 550, rotation: 8, size: 50, weight: 800, outline: false, beatFrame: 46, tockFrame: 66, color: "#FDE047" },
  { text: "tenacious", x: 960, y: 560, rotation: -8, size: 50, weight: 800, outline: false, beatFrame: 67, tockFrame: 87, color: "#FFFFFF" },

  // Gap between image and bottom card
  { text: "tenacious", x: 260, y: 1020, rotation: -5, size: 54, weight: 900, outline: true, beatFrame: 87, tockFrame: 107, color: "#38BDF8" },
  { text: "tenacious", x: 830, y: 1010, rotation: 6, size: 54, weight: 900, outline: false, beatFrame: 108, tockFrame: 128, color: "#F97316" },
];

// Ambient floating particles / subtle glowing sparks
const PARTICLES = Array.from({ length: 30 }).map((_, i) => ({
  id: i,
  left: (i * 31) % 100,
  topOffset: (i * 37) % 100,
  speed: 0.6 + (i % 5) * 0.3,
  opacity: 0.25 + (i % 4) * 0.15,
  size: 4 + (i % 3) * 4,
}));

export const TenaciousRepetitionCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 7-second Chatterbox am_liam audio (pure 1.0x natural speed with tock sound, normal 1.0x example sentence)
  const audioSrc = staticFile("audio/tenacious/tenacious_7s_am_liam.wav");
  const tenaciousImageSrc = staticFile("tenacious.png");

  // 1. Gentle Ken Burns background drift over 7s (210 frames)
  const bgScale = interpolate(frame, [0, 210], [1.08, 1.16], {
    extrapolateRight: "clamp",
  });

  // 2. Entrance spring right from frame 0
  const entranceSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 180 },
  });

  // 3. Smooth, deterministic progress calculation (Nạp từ vào trí nhớ: XX%)
  // Smoothly advances from 0% at frame 4 to 100% at frame 128 (when 6th repetition finishes)
  const progressWidth = interpolate(frame, [4, 128], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const progressPercent = Math.min(100, Math.round(progressWidth));
  const isCompleted = frame >= 128;
  const completionProgress = spring({
    frame: frame - 128,
    fps,
    config: { damping: 14, stiffness: 180 },
  });

  // 4. Example Sentence Reveal Phase (starts at frame 132 ~ 4.40s)
  const isExamplePhase = frame >= 132;
  const exampleProgress = spring({
    frame: frame - 132,
    fps,
    config: { damping: 12, stiffness: 160 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0A0D14",
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
        overflow: "hidden",
        width,
        height,
      }}
    >
      {/* Background Audio (am_liam 1.0x Voice + Tock mixed in) */}
      <Audio src={audioSrc} />

      {/* ============================================================== */}
      {/* 1. LAYER: CINEMATIC DYNAMIC BACKGROUND */}
      {/* ============================================================== */}
      <AbsoluteFill
        style={{
          backgroundImage: `url(${tenaciousImageSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center 40%",
          transform: `scale(${bgScale})`,
          filter: "blur(30px) brightness(0.22)",
          opacity: 0.94,
        }}
      />

      {/* Floating Ambient Particles */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {PARTICLES.map((p) => {
          const yPos = (p.topOffset * 19.2 - frame * p.speed * 12 + 1920) % 1920;
          return (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `${p.left}%`,
                top: `${yPos}px`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                borderRadius: "50%",
                backgroundColor: "#FDBA74",
                opacity: p.opacity,
                filter: "blur(1px)",
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* ============================================================== */}
      {/* 2. LAYER: 6 REPETITION WORDS POPPING UP AROUND THE SCREEN */}
      {/* ============================================================== */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {REPEAT_WORDS.map((item, idx) => {
          if (frame < item.beatFrame) return null;

          // Pop-in spring when word is spoken
          const popSpring = spring({
            frame: frame - item.beatFrame,
            fps,
            config: { damping: 11, stiffness: 220, mass: 0.7 },
          });

          // Tock hit pulse (at the exact moment tock plays right after pronunciation)
          const tockHit = frame >= item.tockFrame
            ? spring({
                frame: frame - item.tockFrame,
                fps,
                config: { damping: 10, stiffness: 260 },
              })
            : 0;
          const scalePulse = popSpring + (frame >= item.tockFrame && frame < item.tockFrame + 8 ? (1 - tockHit) * 0.12 : 0);

          const currentBeatIndex = REPEAT_WORDS.findIndex(
            (w, i) =>
              frame >= w.beatFrame &&
              (i === REPEAT_WORDS.length - 1 || frame < REPEAT_WORDS[i + 1].beatFrame)
          );
          const isLatest = currentBeatIndex === idx && frame < 132;

          return (
            <div
              key={idx}
              style={{
                position: "absolute",
                left: item.x,
                top: item.y,
                transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${scalePulse})`,
                fontSize: `${item.size}px`,
                fontWeight: item.weight,
                color: item.outline ? "transparent" : item.color,
                WebkitTextStroke: item.outline ? `3.5px ${item.color}` : "none",
                textShadow: isLatest
                  ? `0 0 35px ${item.color}, 0 0 15px rgba(255,255,255,0.8)`
                  : "0 6px 18px rgba(0,0,0,0.6)",
                letterSpacing: "-1px",
                zIndex: isLatest ? 30 : 15,
              }}
            >
              {item.text}
            </div>
          );
        })}
      </AbsoluteFill>

      {/* ============================================================== */}
      {/* 3. LAYER: CENTERPIECE CARD & MAIN CONTENT */}
      {/* ============================================================== */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {/* TOP BRAND BADGE */}
        <div
          style={{
            position: "absolute",
            top: 100,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            transform: `scale(${entranceSpring})`,
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.78)",
              backdropFilter: "blur(12px)",
              padding: "12px 32px",
              borderRadius: "40px",
              border: "2px solid rgba(249, 115, 22, 0.4)",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
            }}
          >
            <span
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: "#FB923C",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              🧗 TỪ VỰNG TIẾNG ANH MỖI NGÀY
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CENTER VISUAL: TENACIOUS ILLUSTRATION CARD */}
        {/* ============================================================== */}
        <div
          style={{
            position: "absolute",
            top: 360,
            left: 210,
            width: 660,
            height: 560,
            transform: `scale(${entranceSpring})`,
            borderRadius: "40px",
            overflow: "hidden",
            border: "6px solid #FFFFFF",
            boxShadow:
              "0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(249, 115, 22, 0.25)",
            backgroundColor: "#0A0D14",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Main Visual Image with gentle breathing drift */}
          <Img
            src={tenaciousImageSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${interpolate(frame, [0, 210], [1.02, 1.07])})`,
            }}
          />

          {/* Action Overlay Badge */}
          <div
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              backgroundColor: "rgba(15, 23, 42, 0.8)",
              backdropFilter: "blur(8px)",
              padding: "8px 18px",
              borderRadius: "20px",
              border: "1.5px solid rgba(251, 146, 60, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "16px" }}>🏔️</span>
            <span
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "#FFFFFF",
                letterSpacing: "0.5px",
              }}
            >
              Never Give Up
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* BOTTOM DUOLINGO-STYLE FEATHER CARD (Vocabulary Card) */}
        {/* ============================================================== */}
        <div
          style={{
            position: "absolute",
            bottom: 220,
            left: 80,
            right: 80,
            transform: `scale(${entranceSpring})`,
          }}
        >
          {/* Duolingo Chunky 3D Pushable Card */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "36px",
              padding: "36px 44px",
              boxShadow: "0 10px 0 #DCDCDC, 0 25px 50px rgba(0, 0, 0, 0.5)",
              border: "3px solid #E5E7EB",
              textAlign: "center",
            }}
          >
            {/* Top Row: Word + Part of Speech Badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "18px",
                marginBottom: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "62px",
                  fontWeight: 900,
                  color: "#0F172A",
                  letterSpacing: "-1.5px",
                  textShadow: "-2px 0 #F97316, 2px 0 #38BDF8",
                }}
              >
                tenacious
              </span>
              <span
                style={{
                  backgroundColor: "#FFEDD5",
                  color: "#C2410C",
                  fontSize: "22px",
                  fontWeight: 800,
                  padding: "6px 16px",
                  borderRadius: "14px",
                  border: "2px solid #FED7AA",
                }}
              >
                (adj.)
              </span>
            </div>

            {/* Phonetic Transcription */}
            <div
              style={{
                fontSize: "30px",
                fontWeight: 600,
                color: "#64748B",
                marginBottom: "16px",
              }}
            >
              /təˈneɪ.ʃəs/
            </div>

            {/* Vietnamese Meaning Pill */}
            <div
              style={{
                display: "inline-block",
                backgroundColor: "#FFEDD5",
                border: "2px solid #F97316",
                padding: "12px 30px",
                borderRadius: "20px",
                fontSize: "34px",
                fontWeight: 800,
                color: "#9A3412",
                boxShadow: "0 4px 0 #EA580C",
              }}
            >
              kiên trì, bền bỉ
            </div>

            {/* Example Sentence Reveal Block (Starts at 4.40s / frame 132) */}
            <div
              style={{
                marginTop: "24px",
                paddingTop: "20px",
                borderTop: "2px dashed #E2E8F0",
                opacity: isExamplePhase ? exampleProgress : 0.25,
                transform: `translateY(${
                  isExamplePhase
                    ? interpolate(exampleProgress, [0, 1], [15, 0])
                    : 0
                }px)`,
              }}
            >
              <div
                style={{
                  fontSize: "26px",
                  color: "#1E293B",
                  fontWeight: 700,
                  marginBottom: "6px",
                }}
              >
                💡 <span style={{ color: "#EA580C" }}>She is tenacious</span> and never gives up.
              </div>
              <div
                style={{
                  fontSize: "22px",
                  color: "#64748B",
                  fontWeight: 500,
                }}
              >
                (Cô ấy rất kiên trì và không bao giờ bỏ cuộc.)
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RETENTION PROGRESS BAR ("Nạp từ vào trí nhớ") */}
        {/* ============================================================== */}
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: 80,
            right: 80,
            zIndex: 35,
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.9)",
              backdropFilter: "blur(14px)",
              borderRadius: "28px",
              padding: "18px 28px",
              border: `2px solid ${
                isCompleted
                  ? "rgba(74, 222, 128, 0.45)"
                  : "rgba(255, 255, 255, 0.12)"
              }`,
              boxShadow: isCompleted
                ? "0 10px 30px rgba(0, 0, 0, 0.6), 0 0 25px rgba(74, 222, 128, 0.2)"
                : "0 10px 30px rgba(0, 0, 0, 0.6)",
              transform: isCompleted ? `scale(${1 + completionProgress * 0.02})` : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  color: isCompleted ? "#4ADE80" : "#F8FAFC",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                {isCompleted ? "✅ Đã nạp 100% vào trí nhớ!" : "🧠 Nạp từ vào trí nhớ:"}
              </span>
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: 900,
                  color: isCompleted ? "#4ADE80" : "#38BDF8",
                }}
              >
                {progressPercent}%
              </span>
            </div>

            {/* Glowing Rounded Progress Bar Track */}
            <div
              style={{
                width: "100%",
                height: "16px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "10px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Active Loading Bar (Cyan -> Yellow) */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${progressWidth}%`,
                  borderRadius: "10px",
                  background: "linear-gradient(90deg, #38BDF8, #FDE047)",
                  boxShadow: "0 0 16px rgba(56, 189, 248, 0.8)",
                  opacity: 1 - completionProgress,
                }}
              />
              {/* Success Celebration Bar (Green) */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${progressWidth}%`,
                  borderRadius: "10px",
                  background: "linear-gradient(90deg, #22C55E, #4ADE80)",
                  boxShadow: "0 0 16px rgba(74, 222, 128, 0.8)",
                  opacity: completionProgress,
                }}
              />
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

