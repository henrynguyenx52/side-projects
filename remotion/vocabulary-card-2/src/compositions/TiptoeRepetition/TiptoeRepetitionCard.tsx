import React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// 13 repetition words with am_adam voice at normal speed 1.0 (tight ~0.15s interval between words)
// Beats @ 30fps:
// 0.35s (10), 0.99s (30), 1.63s (49), 2.27s (68), 2.91s (87), 3.55s (106),
// 4.19s (126), 4.83s (145), 5.47s (164), 6.11s (183), 6.75s (202), 7.39s (222), 8.03s (241)
const REPEAT_WORDS = [
  // Top row
  { text: "tiptoe", x: 420, y: 220, rotation: -3, size: 66, weight: 800, outline: false, beatFrame: 10, color: "#FFFFFF" },
  { text: "tiptoe", x: 130, y: 240, rotation: -8, size: 58, weight: 800, outline: false, beatFrame: 30, color: "#FFFFFF" },
  { text: "tiptoe", x: 760, y: 230, rotation: 7, size: 62, weight: 900, outline: true, beatFrame: 49, color: "#38BDF8" },

  // Left & Right sides of video card (video card spans left 200 -> right 880)
  { text: "tiptoe", x: 95, y: 490, rotation: 9, size: 52, weight: 900, outline: true, beatFrame: 68, color: "#38BDF8" },
  { text: "tiptoe", x: 985, y: 490, rotation: -7, size: 52, weight: 800, outline: false, beatFrame: 87, color: "#FDE047" },
  { text: "tiptoe", x: 90, y: 730, rotation: -10, size: 54, weight: 800, outline: false, beatFrame: 106, color: "#FFFFFF" },
  { text: "tiptoe", x: 980, y: 730, rotation: 11, size: 54, weight: 900, outline: true, beatFrame: 126, color: "#FFFFFF" },

  // Gap between video and bottom card
  { text: "tiptoe", x: 160, y: 940, rotation: -6, size: 60, weight: 800, outline: false, beatFrame: 145, color: "#93C5FD" },
  { text: "tiptoe", x: 540, y: 920, rotation: 3, size: 64, weight: 900, outline: true, beatFrame: 164, color: "#FDE047" },
  { text: "tiptoe", x: 890, y: 940, rotation: -7, size: 58, weight: 800, outline: false, beatFrame: 183, color: "#FFFFFF" },

  // Sides of bottom card
  { text: "tiptoe", x: 75, y: 1260, rotation: 6, size: 52, weight: 900, outline: true, beatFrame: 202, color: "#38BDF8" },
  { text: "tiptoe", x: 1005, y: 1250, rotation: -8, size: 52, weight: 800, outline: false, beatFrame: 222, color: "#FFFFFF" },

  // Below bottom card
  { text: "tiptoe", x: 540, y: 1720, rotation: 4, size: 64, weight: 900, outline: true, beatFrame: 241, color: "#38BDF8" },
];

// Ambient sunlit floating dust motes / light particles
const PARTICLES = Array.from({ length: 30 }).map((_, i) => ({
  id: i,
  left: (i * 31) % 100,
  topOffset: (i * 37) % 100,
  speed: 0.6 + (i % 5) * 0.3,
  opacity: 0.25 + (i % 4) * 0.15,
  size: 4 + (i % 3) * 4,
}));

export const TiptoeRepetitionCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 12-second Kokoro am_adam audio (normal speed 1.0, fast intervals, example sentence)
  const audioSrc = staticFile("audio/tiptoe/tiptoe_12s_am_adam.wav");
  const videoSrc = staticFile("tiptoe_12s.mp4");
  const bgImageSrc = staticFile("tiptoe_bg.jpg");

  // 1. Gentle Ken Burns background drift
  const bgScale = interpolate(frame, [0, 360], [1.08, 1.18], {
    extrapolateRight: "clamp",
  });

  // 2. Entrance spring right from frame 0 (no hook delay)
  const entranceSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 180 },
  });

  // 3. Progress calculation (Nạp từ vào trí nhớ: XX%)
  // Smoothly advances with the rapid repetition up to frame 260 (~8.7s)
  const progressPercent = Math.min(
    100,
    Math.round(
      interpolate(
        frame,
        [0, 30, 68, 106, 145, 183, 222, 260],
        [15, 28, 42, 58, 72, 85, 94, 100],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    )
  );

  // 4. Example Sentence Reveal Phase (starts at frame 260 ~ 8.67s)
  const isExamplePhase = frame >= 260;
  const exampleProgress = spring({
    frame: frame - 260,
    fps,
    config: { damping: 12, stiffness: 160 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#080E1A",
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
        overflow: "hidden",
        width,
        height,
      }}
    >
      {/* Background Audio */}
      <Audio src={audioSrc} />

      {/* ============================================================== */}
      {/* 1. LAYER: CINEMATIC DYNAMIC BACKGROUND */}
      {/* ============================================================== */}
      <AbsoluteFill
        style={{
          backgroundImage: `url(${bgImageSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center 45%",
          transform: `scale(${bgScale})`,
          filter: "blur(24px) brightness(0.32)",
          opacity: 0.92,
        }}
      />

      {/* 3. Floating Ambient Particles */}
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
                backgroundColor: "#FEF08A",
                opacity: p.opacity,
                filter: "blur(1px)",
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* ============================================================== */}
      {/* 2. LAYER: 13 REPETITION WORDS POPPING UP AROUND THE SCREEN */}
      {/* ============================================================== */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {REPEAT_WORDS.map((item, idx) => {
          if (frame < item.beatFrame) return null;

          const popSpring = spring({
            frame: frame - item.beatFrame,
            fps,
            config: { damping: 11, stiffness: 220, mass: 0.7 },
          });

          const currentBeatIndex = REPEAT_WORDS.findIndex(
            (w, i) =>
              frame >= w.beatFrame &&
              (i === REPEAT_WORDS.length - 1 || frame < REPEAT_WORDS[i + 1].beatFrame)
          );
          const isLatest = currentBeatIndex === idx;

          return (
            <div
              key={idx}
              style={{
                position: "absolute",
                left: item.x,
                top: item.y,
                transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${popSpring})`,
                fontSize: `${item.size}px`,
                fontWeight: item.weight,
                color: item.outline ? "transparent" : item.color,
                WebkitTextStroke: item.outline ? `3.5px ${item.color}` : "none",
                textShadow: isLatest
                  ? `0 0 35px ${item.color}, 0 0 15px rgba(255,255,255,0.8)`
                  : "0 6px 18px rgba(0,0,0,0.6)",
                letterSpacing: "-1px",
                zIndex: isLatest ? 30 : 15,
                transition: "text-shadow 0.15s ease",
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
              backgroundColor: "rgba(15, 23, 42, 0.75)",
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
              🥋 TỪ VỰNG TIẾNG ANH MỖI NGÀY
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CENTER VISUAL: BRIGHT 16:9 VIDEO CARD */}
        {/* ============================================================== */}
        <div
          style={{
            position: "absolute",
            top: 410,
            left: 200,
            width: 680,
            height: 382.5, // Exact 16:9 ratio (680 / 382.5 = 16/9)
            transform: `scale(${entranceSpring})`,
            borderRadius: "36px",
            overflow: "hidden",
            border: "6px solid #FFFFFF",
            boxShadow:
              "0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(56, 189, 248, 0.25)",
            backgroundColor: "#0F172A",
          }}
        >
          {/* High-definition 16:9 Video */}
          <OffthreadVideo
            src={videoSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />

          {/* Action Overlay Badge */}
          <div
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              backgroundColor: "rgba(15, 23, 42, 0.75)",
              backdropFilter: "blur(8px)",
              padding: "8px 18px",
              borderRadius: "20px",
              border: "1.5px solid rgba(255, 255, 255, 0.25)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "16px" }}>✨</span>
            <span
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "#FFFFFF",
                letterSpacing: "0.5px",
              }}
            >
              Quiet Step
            </span>
          </div>

          {/* Subtle Gradient Shadow at bottom */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "70px",
              background:
                "linear-gradient(to top, rgba(15, 23, 42, 0.5), transparent)",
            }}
          />
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
                  fontSize: "68px",
                  fontWeight: 900,
                  color: "#0F172A",
                  letterSpacing: "-1.5px",
                  textShadow: "-2px 0 #38BDF8, 2px 0 #EC4899",
                }}
              >
                tiptoe
              </span>
              <span
                style={{
                  backgroundColor: "#E0F2FE",
                  color: "#0284C7",
                  fontSize: "22px",
                  fontWeight: 800,
                  padding: "6px 16px",
                  borderRadius: "14px",
                  border: "2px solid #BAE6FD",
                }}
              >
                (v, n)
              </span>
            </div>

            {/* Phonetic Transcription */}
            <div
              style={{
                fontSize: "32px",
                fontWeight: 600,
                color: "#64748B",
                marginBottom: "16px",
              }}
            >
              /ˈtɪp.toʊ/
            </div>

            {/* Vietnamese Meaning Pill */}
            <div
              style={{
                display: "inline-block",
                backgroundColor: "#FEF08A",
                border: "2px solid #FACC15",
                padding: "12px 30px",
                borderRadius: "20px",
                fontSize: "34px",
                fontWeight: 800,
                color: "#854D0E",
                boxShadow: "0 4px 0 #EAB308",
              }}
            >
              đi nhón chân
            </div>

            {/* Example Sentence Reveal Block (Starts around 8.5s / frame 260) */}
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
                transition: "opacity 0.3s ease",
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
                💡 <span style={{ color: "#0284C7" }}>She tiptoed</span> quietly into the room.
              </div>
              <div
                style={{
                  fontSize: "22px",
                  color: "#64748B",
                  fontWeight: 500,
                }}
              >
                (Cô ấy rón rén nhón chân vào phòng.)
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
              border: "2px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
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
                  color: progressPercent === 100 ? "#4ADE80" : "#F8FAFC",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                {progressPercent === 100 ? "✅ Đã nạp 100% vào trí nhớ!" : "🧠 Nạp từ vào trí nhớ:"}
              </span>
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: 900,
                  color: progressPercent === 100 ? "#4ADE80" : "#38BDF8",
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
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background:
                    progressPercent === 100
                      ? "linear-gradient(90deg, #22C55E, #4ADE80)"
                      : "linear-gradient(90deg, #38BDF8, #FDE047)",
                  borderRadius: "10px",
                  boxShadow:
                    progressPercent === 100
                      ? "0 0 16px rgba(74, 222, 128, 0.8)"
                      : "0 0 16px rgba(56, 189, 248, 0.8)",
                  transition: "width 0.1s linear",
                }}
              />
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
