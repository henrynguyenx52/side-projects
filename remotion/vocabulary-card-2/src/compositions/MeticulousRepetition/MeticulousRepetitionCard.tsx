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

// 9 repetition words with Chatterbox am_liam voice @ natural speed + tock sound right after pronunciation
// Beats @ 30fps (Word start -> Tock frame):
// #1: 0.15s (frame 4)   -> tock 0.840s (frame 25)
// #2: 0.82s (frame 25)  -> tock 1.509s (frame 45)
// #3: 1.49s (frame 45)  -> tock 2.179s (frame 65)
// #4: 2.16s (frame 65)  -> tock 2.849s (frame 85)
// #5: 2.83s (frame 85)  -> tock 3.519s (frame 106)
// #6: 3.50s (frame 105) -> tock 4.189s (frame 126)
// #7: 4.17s (frame 125) -> tock 4.859s (frame 146)
// #8: 4.84s (frame 145) -> tock 5.529s (frame 166)
// #9: 5.51s (frame 165) -> tock 6.199s (frame 186)
const REPEAT_WORDS = [
  // Top row
  { text: "meticulous", x: 230, y: 220, rotation: -6, size: 48, weight: 900, outline: false, beatFrame: 4, tockFrame: 25, color: "#FFFFFF" },
  { text: "meticulous", x: 850, y: 210, rotation: 7, size: 48, weight: 900, outline: true, beatFrame: 25, tockFrame: 45, color: "#38BDF8" },

  // Left & Right sides of image (safe outer placement)
  { text: "meticulous", x: 95, y: 470, rotation: 9, size: 36, weight: 800, outline: false, beatFrame: 45, tockFrame: 65, color: "#FDE047" },
  { text: "meticulous", x: 985, y: 470, rotation: -9, size: 36, weight: 800, outline: false, beatFrame: 65, tockFrame: 85, color: "#FFFFFF" },
  { text: "meticulous", x: 95, y: 730, rotation: -8, size: 36, weight: 800, outline: true, beatFrame: 85, tockFrame: 106, color: "#C084FC" },
  { text: "meticulous", x: 985, y: 730, rotation: 8, size: 36, weight: 800, outline: false, beatFrame: 105, tockFrame: 126, color: "#FDE047" },

  // Gap between image and bottom card
  { text: "meticulous", x: 230, y: 990, rotation: -5, size: 48, weight: 900, outline: true, beatFrame: 125, tockFrame: 146, color: "#38BDF8" },
  { text: "meticulous", x: 850, y: 990, rotation: 6, size: 48, weight: 900, outline: false, beatFrame: 145, tockFrame: 166, color: "#F59E0B" },
  { text: "meticulous", x: 540, y: 1050, rotation: -2, size: 50, weight: 900, outline: true, beatFrame: 165, tockFrame: 186, color: "#4ADE80" },
];

// Ambient floating particles / warm sparks
const PARTICLES = Array.from({ length: 30 }).map((_, i) => ({
  id: i,
  left: (i * 31) % 100,
  topOffset: (i * 37) % 100,
  speed: 0.6 + (i % 5) * 0.3,
  opacity: 0.25 + (i % 4) * 0.15,
  size: 4 + (i % 3) * 4,
}));

export const MeticulousRepetitionCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 9-second Chatterbox am_liam audio (pure natural speed with tock sound, normal 1.0x example sentence)
  const audioSrc = staticFile("audio/meticulous/meticulous_9s_am_liam.wav");
  const meticulousImageSrc = staticFile("meticulous.png");

  // 1. Gentle Ken Burns background drift over 9s (270 frames)
  const bgScale = interpolate(frame, [0, 270], [1.08, 1.18], {
    extrapolateRight: "clamp",
  });

  // 2. Entrance spring right from frame 0
  const entranceSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 180 },
  });

  // 3. Smooth, deterministic progress calculation (Nạp từ vào trí nhớ: XX%)
  // Smoothly advances from 0% at frame 4 to 100% at frame 186 (when 9th repetition finishes)
  const progressWidth = interpolate(frame, [4, 186], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const progressPercent = Math.min(100, Math.round(progressWidth));
  const isCompleted = frame >= 186;
  const completionProgress = spring({
    frame: frame - 186,
    fps,
    config: { damping: 14, stiffness: 180 },
  });

  // 4. Example Sentence Reveal Phase (starts at frame 189 ~ 6.30s)
  const isExamplePhase = frame >= 189;
  const exampleProgress = spring({
    frame: frame - 189,
    fps,
    config: { damping: 12, stiffness: 160 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0B0E14",
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
        overflow: "hidden",
        width,
        height,
      }}
    >
      {/* Background Audio (am_liam Voice + Tock mixed in) */}
      <Audio src={audioSrc} />

      {/* ============================================================== */}
      {/* 1. LAYER: CINEMATIC DYNAMIC BACKGROUND */}
      {/* ============================================================== */}
      <AbsoluteFill
        style={{
          backgroundImage: `url(${meticulousImageSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center 40%",
          transform: `scale(${bgScale})`,
          filter: "blur(32px) brightness(0.24)",
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
                backgroundColor: "#FCD34D",
                opacity: p.opacity,
                filter: "blur(1px)",
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* ============================================================== */}
      {/* 2. LAYER: 9 REPETITION WORDS POPPING UP AROUND THE SCREEN */}
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
          const isLatest = currentBeatIndex === idx && frame < 189;

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
              border: "2px solid rgba(56, 189, 248, 0.45)",
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
              🔍 TỪ VỰNG TIẾNG ANH MỖI NGÀY
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CENTER VISUAL: METICULOUS ILLUSTRATION CARD (Exact 4:3 Ratio) */}
        {/* ============================================================== */}
        <div
          style={{
            position: "absolute",
            top: 360,
            left: 180,
            width: 720,
            height: 540,
            transform: `scale(${entranceSpring})`,
            borderRadius: "40px",
            overflow: "hidden",
            border: "6px solid #FFFFFF",
            boxShadow:
              "0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(56, 189, 248, 0.25)",
            backgroundColor: "#161B26",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Main Visual Image with gentle breathing drift */}
          <Img
            src={meticulousImageSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "38% center",
              transform: `scale(${interpolate(frame, [0, 270], [1.01, 1.05])})`,
            }}
          />

          {/* Action Overlay Badge */}
          <div
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              backgroundColor: "rgba(15, 23, 42, 0.82)",
              backdropFilter: "blur(8px)",
              padding: "8px 18px",
              borderRadius: "20px",
              border: "1.5px solid rgba(56, 189, 248, 0.45)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "16px" }}>🔍</span>
            <span
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "#FFFFFF",
                letterSpacing: "0.5px",
              }}
            >
              Attention to Detail
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
                  textShadow: "-2px 0 #38BDF8, 2px 0 #F59E0B",
                }}
              >
                meticulous
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
              /məˈtɪk.jə.ləs/
            </div>

            {/* Vietnamese Meaning Pill */}
            <div
              style={{
                display: "inline-block",
                backgroundColor: "#FEF3C7",
                border: "2px solid #F59E0B",
                padding: "12px 30px",
                borderRadius: "20px",
                fontSize: "34px",
                fontWeight: 800,
                color: "#92400E",
                boxShadow: "0 4px 0 #D97706",
              }}
            >
              tỉ mỉ, cẩn thận, chu đáo
            </div>

            {/* Example Sentence Reveal Block (Starts at 6.30s / frame 189) */}
            <div
              style={{
                marginTop: "24px",
                paddingTop: "20px",
                borderTop: "2px dashed #E2E8F0",
                opacity: isExamplePhase ? exampleProgress : 0.25,
                transform: `translateY(${isExamplePhase
                    ? interpolate(exampleProgress, [0, 1], [15, 0])
                    : 0
                  }px)`,
              }}
            >
              <div
                style={{
                  fontSize: "25px",
                  color: "#1E293B",
                  fontWeight: 700,
                  marginBottom: "6px",
                  lineHeight: 1.3,
                }}
              >
                💡 She is <span style={{ color: "#0284C7" }}>meticulous</span> when building her model.
              </div>
              <div
                style={{
                  fontSize: "21px",
                  color: "#64748B",
                  fontWeight: 500,
                  lineHeight: 1.3,
                }}
              >
                (Cô ấy rất tỉ mỉ khi làm mô hình của mình.)
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
              border: `2px solid ${isCompleted
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

