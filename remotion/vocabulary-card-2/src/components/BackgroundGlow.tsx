import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

export const BackgroundGlow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Floating gentle motion
  const floatA = Math.sin((frame / fps) * Math.PI * 0.4) * 18;
  const floatB = Math.cos((frame / fps) * Math.PI * 0.35) * 20;
  const floatC = Math.sin((frame / fps) * Math.PI * 0.25) * 14;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#F7F7F7",
        overflow: "hidden",
      }}
    >
      {/* 1. Subtle Playful Dot Matrix Pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(#E5E5E5 2px, transparent 2px)",
          backgroundSize: "40px 40px",
          opacity: 0.85,
          pointerEvents: "none",
        }}
      />

      {/* 2. Top-Left Soft Macaw Blue Aura (Say) */}
      <div
        style={{
          position: "absolute",
          top: "-8%",
          left: "-12%",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(28, 176, 246, 0.12) 0%, rgba(28, 176, 246, 0.03) 55%, transparent 75%)",
          transform: `translateY(${floatA}px)`,
          filter: "blur(70px)",
          pointerEvents: "none",
        }}
      />

      {/* 3. Top-Right Soft Fox Orange Aura (Tell) */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          right: "-15%",
          width: 750,
          height: 750,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255, 150, 0, 0.10) 0%, rgba(255, 150, 0, 0.02) 55%, transparent 75%)",
          transform: `translateY(${floatB}px)`,
          filter: "blur(70px)",
          pointerEvents: "none",
        }}
      />

      {/* 4. Bottom Feather Green Soft Ambient Light */}
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "20%",
          width: 850,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(88, 204, 2, 0.10) 0%, rgba(88, 204, 2, 0.02) 60%, transparent 80%)",
          transform: `translateY(${floatC}px)`,
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      {/* 5. Playful Floating Decorative Dots */}
      <div
        style={{
          position: "absolute",
          top: 180,
          left: 60,
          width: 24,
          height: 24,
          borderRadius: "50%",
          backgroundColor: "#58CC02",
          opacity: 0.25,
          transform: `translateY(${floatA * 0.8}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 320,
          right: 70,
          width: 32,
          height: 32,
          borderRadius: "50%",
          backgroundColor: "#1CB0F6",
          opacity: 0.2,
          transform: `translateY(${floatB * 0.7}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 260,
          left: 80,
          width: 28,
          height: 28,
          borderRadius: "50%",
          backgroundColor: "#FFC800",
          opacity: 0.3,
          transform: `translateY(${floatC}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 380,
          right: 90,
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: "#FF4B4B",
          opacity: 0.25,
          transform: `translateY(${floatA}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
