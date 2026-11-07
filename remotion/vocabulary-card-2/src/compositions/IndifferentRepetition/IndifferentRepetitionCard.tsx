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
// #1: 0.15s (frame 4)   -> tock 0.84s (frame 25)
// #2: 0.82s (frame 25)  -> tock 1.51s (frame 45)
// #3: 1.49s (frame 45)  -> tock 2.18s (frame 65)
// #4: 2.16s (frame 65)  -> tock 2.85s (frame 85)
// #5: 2.83s (frame 85)  -> tock 3.52s (frame 106)
// #6: 3.50s (frame 105) -> tock 4.19s (frame 126)
const REPEAT_WORDS = [
  // Top row
  { text: "indifferent", x: 250, y: 230, rotation: -6, size: 52, weight: 900, outline: false, beatFrame: 4, tockFrame: 25, color: "#FFFFFF" },
  { text: "indifferent", x: 840, y: 220, rotation: 7, size: 52, weight: 900, outline: true, beatFrame: 25, tockFrame: 45, color: "#38BDF8" },

  // Left & Right sides of image (safe margins for 11-letter word)
  { text: "indifferent", x: 140, y: 580, rotation: 8, size: 42, weight: 800, outline: false, beatFrame: 45, tockFrame: 65, color: "#94A3B8" },
  { text: "indifferent", x: 940, y: 580, rotation: -8, size: 42, weight: 800, outline: false, beatFrame: 65, tockFrame: 85, color: "#FFFFFF" },

  // Gap between image and bottom card
  { text: "indifferent", x: 260, y: 990, rotation: -5, size: 50, weight: 900, outline: true, beatFrame: 85, tockFrame: 106, color: "#818CF8" },
  { text: "indifferent", x: 830, y: 980, rotation: 6, size: 50, weight: 900, outline: false, beatFrame: 105, tockFrame: 126, color: "#38BDF8" },
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

export const IndifferentRepetitionCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 7-second Chatterbox am_liam audio (pure 1.0x natural speed with tock sound, normal 1.0x example sentence)
  const audioSrc = staticFile("audio/indifferent/indifferent_7s_am_liam.wav");
  const indifferentImageSrc = staticFile("indifferent.png");

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
  // Smoothly advances from 0% at frame 4 to 100% at frame 126 (when 6th repetition finishes)
  const progressWidth = interpolate(frame, [4, 126], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const progressPercent = Math.min(100, Math.round(progressWidth));
  const isCompleted = frame >= 126;
  const completionProgress = spring({
    frame: frame - 126,
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
          backgroundImage: `url(${indifferentImageSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center 40%",
          transform: `scale(${bgScale})`,
          filter: "blur(32px) brightness(0.20)",
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
                backgroundColor: "#93C5FD",
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
              border: "2px solid rgba(56, 189, 248, 0.4)",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
            }}
          >
            <span
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: "#38BDF8",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              🥱 TỪ VỰNG TIẾNG ANH MỖI NGÀY
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CENTER VISUAL: INDIFFERENT ILLUSTRATION CARD */}
        {/* ============================================================== */}
        <div
          style={{
            position: "absolute",
            top: 400,
            left: 170,
            width: 740,
            height: 480,
            transform: `scale(${entranceSpring})`,
            borderRadius: "40px",
            overflow: "hidden",
            border: "6px solid #FFFFFF",
            boxShadow:
              "0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(56, 189, 248, 0.25)",
            backgroundColor: "#FAF9F6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Main Visual Image with gentle breathing drift */}
          <Img
            src={indifferentImageSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transform: `scale(${interpolate(frame, [0, 210], [1.01, 1.05])})`,
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
              border: "1.5px solid rgba(56, 189, 248, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "16px" }}>☕</span>
            <span
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "#FFFFFF",
                letterSpacing: "0.5px",
              }}
            >
              Unbothered
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
                  textShadow: "-2px 0 #38BDF8, 2px 0 #818CF8",
                }}
              >
                indifferent
              </span>
              <span
                style={{
                  backgroundColor: "#E0F2FE",
                  color: "#0369A1",
                  fontSize: "22px",
                  fontWeight: 800,
                  padding: "6px 16px",
                  borderRadius: "14px",
                  border: "2px solid #BAE6FD",
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
              /ɪnˈdɪf.ər.ənt/
            </div>

            {/* Vietnamese Meaning Pill */}
            <div
              style={{
                display: "inline-block",
                backgroundColor: "#E0F2FE",
                border: "2px solid #0284C7",
                padding: "12px 30px",
                borderRadius: "20px",
                fontSize: "34px",
                fontWeight: 800,
                color: "#075985",
                boxShadow: "0 4px 0 #0284C7",
              }}
            >
              thờ ơ, lãnh đạm
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
                💡 He remained <span style={{ color: "#0284C7" }}>indifferent</span> to the gossip.
              </div>
              <div
                style={{
                  fontSize: "22px",
                  color: "#64748B",
                  fontWeight: 500,
                }}
              >
                (Cậu ấy vẫn thờ ơ với những lời đàm tiếu.)
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
