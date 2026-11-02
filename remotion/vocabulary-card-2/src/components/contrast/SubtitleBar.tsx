import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SubtitleCue } from "../../types";
import { sansFamily } from "../../fonts";

interface SubtitleBarProps {
  subtitles: SubtitleCue[];
}

export const SubtitleBar: React.FC<SubtitleBarProps> = ({ subtitles }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Find active cue
  const activeCue = subtitles.find(
    (c) => frame >= c.startFrame && frame <= c.endFrame
  );

  if (!activeCue) {
    return null;
  }

  // Animation for the active cue
  const cueProgress = spring({
    frame: frame - activeCue.startFrame,
    fps,
    config: { damping: 14, mass: 0.5, stiffness: 120 },
  });

  const scale = interpolate(cueProgress, [0, 1], [0.94, 1]);
  const opacity = interpolate(cueProgress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 88,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 100,
        pointerEvents: "none",
        padding: "0 48px",
      }}
    >
      <div
        style={{
          background: activeCue.isKeyword ? "#FFF4CC" : "#FFFFFF",
          border: activeCue.isKeyword ? "2px solid #FFC800" : "2px solid #E5E5E5",
          borderBottom: activeCue.isKeyword ? "5px solid #E5A500" : "5px solid #DCDCDC",
          boxShadow: activeCue.isKeyword
            ? "0 8px 24px rgba(255, 200, 0, 0.25)"
            : "0 8px 24px rgba(0, 0, 0, 0.08)",
          padding: "16px 38px",
          borderRadius: 9999,
          transform: `scale(${scale})`,
          opacity,
          maxWidth: 960,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: `${sansFamily}, sans-serif`,
            fontSize: 34,
            fontWeight: 800,
            color: activeCue.isKeyword ? "#D48800" : "#3C3C3C",
            letterSpacing: "0.01em",
          }}
        >
          {activeCue.text}
        </span>
      </div>
    </div>
  );
};
