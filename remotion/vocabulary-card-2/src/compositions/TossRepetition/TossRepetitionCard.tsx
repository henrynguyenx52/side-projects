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

// 15 repetition words with am_adam voice at normal speed 1.0 (fast ~0.16s gap between words)
// Beats @ 30fps:
// 0.35s (10), 0.89s (27), 1.43s (43), 1.97s (59), 2.51s (75), 3.05s (92),
// 3.59s (108), 4.13s (124), 4.67s (140), 5.21s (156), 5.75s (172), 6.29s (189),
// 6.83s (205), 7.37s (221), 7.91s (237)
const REPEAT_WORDS = [
  // Top row
  { text: "toss", x: 440, y: 220, rotation: -4, size: 66, weight: 800, outline: false, beatFrame: 10, color: "#FFFFFF" },
  { text: "toss", x: 130, y: 240, rotation: -9, size: 58, weight: 800, outline: false, beatFrame: 27, color: "#FFFFFF" },
  { text: "toss", x: 770, y: 230, rotation: 8, size: 62, weight: 900, outline: true, beatFrame: 43, color: "#38BDF8" },

  // Left & Right sides of image
  { text: "toss", x: 45, y: 480, rotation: 10, size: 56, weight: 900, outline: true, beatFrame: 59, color: "#38BDF8" },
  { text: "toss", x: 880, y: 460, rotation: -7, size: 54, weight: 800, outline: false, beatFrame: 75, color: "#FDE047" },
  { text: "toss", x: 35, y: 740, rotation: -11, size: 58, weight: 800, outline: false, beatFrame: 92, color: "#FFFFFF" },
  { text: "toss", x: 870, y: 730, rotation: 12, size: 60, weight: 900, outline: true, beatFrame: 108, color: "#FFFFFF" },

  // Gap between image and bottom card
  { text: "toss", x: 120, y: 1020, rotation: -6, size: 62, weight: 800, outline: false, beatFrame: 124, color: "#93C5FD" },
  { text: "toss", x: 460, y: 1000, rotation: 3, size: 66, weight: 900, outline: true, beatFrame: 140, color: "#FDE047" },
  { text: "toss", x: 780, y: 1020, rotation: -8, size: 60, weight: 800, outline: false, beatFrame: 156, color: "#FFFFFF" },

  // Sides of bottom card
  { text: "toss", x: 50, y: 1240, rotation: 7, size: 54, weight: 900, outline: true, beatFrame: 172, color: "#38BDF8" },
  { text: "toss", x: 880, y: 1230, rotation: -9, size: 56, weight: 800, outline: false, beatFrame: 189, color: "#FFFFFF" },
  { text: "toss", x: 60, y: 1460, rotation: -5, size: 52, weight: 800, outline: true, beatFrame: 205, color: "#FDE047" },
  { text: "toss", x: 875, y: 1450, rotation: 8, size: 54, weight: 900, outline: false, beatFrame: 221, color: "#38BDF8" },

  // Below bottom card
  { text: "toss", x: 450, y: 1720, rotation: 4, size: 68, weight: 900, outline: true, beatFrame: 237, color: "#38BDF8" },
];

// Ambient floating particles
const PARTICLES = Array.from({ length: 30 }).map((_, i) => ({
  id: i,
  left: (i * 31) % 100,
  topOffset: (i * 37) % 100,
  speed: 0.6 + (i % 5) * 0.3,
  opacity: 0.2 + (i % 4) * 0.15,
  size: 4 + (i % 3) * 4,
}));

export const TossRepetitionCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 12-second Kokoro am_adam audio (normal speed 1.0, fast intervals, example sentence)
  const audioSrc = staticFile("audio/toss/toss_12s_am_adam.wav");
  const videoSrc = staticFile("toss_coin_12s.mp4");
  const bgImageSrc = staticFile("toss_coin_bg.jpg");

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
  // Smoothly advances with the rapid repetition up to frame 255 (~8.5s)
  const progressPercent = Math.min(
    100,
    Math.round(
      interpolate(
        frame,
        [0, 27, 59, 92, 124, 156, 189, 221, 255],
        [15, 26, 40, 52, 65, 78, 88, 95, 100],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    )
  );

  // 4. Example Sentence Reveal Phase (starts at frame 255 ~ 8.5s)
  const isExamplePhase = frame >= 255;
  const exampleProgress = spring({
    frame: frame - 255,
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
      {/* 1. am_adam Voiceover Audio */}
      <Audio src={audioSrc} />

      {/* 2. Atmospheric Background Image with Blur */}
      <div
        style={{
          position: "absolute",
          inset: -40,
          backgroundImage: `url(${bgImageSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center 35%",
          transform: `scale(${bgScale})`,
          filter: "blur(24px) brightness(0.28)",
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
                backgroundColor: "#FDE047",
                opacity: p.opacity,
                boxShadow: "0 0 10px rgba(253, 224, 71, 0.6)",
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* 4. Top Header Tag: Mobile Pill */}
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 30,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(12px)",
            padding: "14px 28px",
            borderRadius: "999px",
            border: "2px solid rgba(56, 189, 248, 0.3)",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.5)",
          }}
        >
          <span style={{ fontSize: "28px" }}>🪙</span>
          <span
            style={{
              color: "#38BDF8",
              fontSize: "24px",
              fontWeight: 800,
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}
          >
            Từ Vựng Tiếng Anh Mỗi Ngày
          </span>
        </div>
      </div>

      {/* 5. Main Content Area */}
      <AbsoluteFill style={{ zIndex: 20 }}>
        {/* Scattered Repetition Words */}
        {REPEAT_WORDS.map((w, idx) => {
          if (frame < w.beatFrame) return null;

          const wordSpring = spring({
            frame: frame - w.beatFrame,
            fps,
            config: { damping: 11, stiffness: 220 },
          });

          // Soften slightly when example appears
          const wordFade = isExamplePhase
            ? interpolate(exampleProgress, [0, 1], [1, 0.28])
            : 1;

          return (
            <div
              key={idx}
              style={{
                position: "absolute",
                left: `${w.x}px`,
                top: `${w.y}px`,
                transform: `scale(${wordSpring}) rotate(${w.rotation}deg)`,
                transformOrigin: "center",
                fontSize: `${w.size}px`,
                fontWeight: w.weight,
                color: w.outline ? "transparent" : w.color,
                WebkitTextStroke: w.outline ? `2.5px ${w.color}` : "none",
                textShadow: w.outline
                  ? "none"
                  : "0 6px 18px rgba(0, 0, 0, 0.7)",
                opacity: wordFade,
                pointerEvents: "none",
                letterSpacing: "-1px",
              }}
            >
              {w.text}
            </div>
          );
        })}

        {/* Central Aesthetic Visual Card (High-res Video of Tossing Object) */}
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
            "0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(253, 224, 71, 0.25)",
            backgroundColor: "#0F172A",
          }}
        >
            {/* Looping Toss Video with Ambient Blurred Backdrop */}
          <OffthreadVideo
            src={videoSrc}
            style={{
              position: "absolute",
              inset: -20,
              width: "calc(100% + 40px)",
              height: "calc(100% + 40px)",
              objectFit: "cover",
              objectPosition: "center 40%",
              filter: "blur(16px) brightness(0.65)",
            }}
          />
          <OffthreadVideo
            src={videoSrc}
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              objectFit: "contain",
              zIndex: 2,
            }}
          />

          {/* Action Overlay Badge */}
          <div
            style={{
              position: "absolute",
              top: 24,
              right: 24,
              backgroundColor: "rgba(15, 23, 42, 0.75)",
              backdropFilter: "blur(10px)",
              padding: "10px 20px",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <span style={{ fontSize: "22px" }}>🪙</span>
            <span
              style={{
                color: "#FEF08A",
                fontSize: "18px",
                fontWeight: 700,
              }}
            >
              Toss Action
            </span>
          </div>

          {/* Subtle Gradient Shadow at bottom */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "140px",
              background:
                "linear-gradient(to top, rgba(15, 23, 42, 0.85), transparent)",
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
                toss
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
                (v)
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
              /tɔːs/
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
              ném nhẹ
            </div>

            {/* Example Sentence Reveal Block (Starts around 8.5s / frame 255) */}
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
                💡 <span style={{ color: "#0284C7" }}>Toss</span> me the keys.
              </div>
              <div
                style={{
                  fontSize: "22px",
                  color: "#64748B",
                  fontWeight: 500,
                }}
              >
                (Ném cho tôi chùm chìa khóa.)
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
                  color: progressPercent === 100 ? "#4ADE80" : "#F1F5F9",
                  fontSize: "22px",
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                }}
              >
                {progressPercent === 100
                  ? "✅ Đã nạp 100% vào trí nhớ!"
                  : "🧠 Nạp từ vào trí nhớ:"}
              </span>
              <span
                style={{
                  color: progressPercent === 100 ? "#4ADE80" : "#38BDF8",
                  fontSize: "26px",
                  fontWeight: 900,
                }}
              >
                {progressPercent}%
              </span>
            </div>

            {/* Progress Track */}
            <div
              style={{
                width: "100%",
                height: "16px",
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                borderRadius: "999px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background:
                    progressPercent === 100
                      ? "linear-gradient(90deg, #22C55E, #4ADE80)"
                      : "linear-gradient(90deg, #38BDF8, #FACC15)",
                  borderRadius: "999px",
                  boxShadow: "0 0 12px rgba(56, 189, 248, 0.8)",
                  transition: "width 0.2s ease-out",
                }}
              />
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

