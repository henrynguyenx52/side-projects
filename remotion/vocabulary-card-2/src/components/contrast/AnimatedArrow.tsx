import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DirectionType } from "../../types";
import { sansFamily } from "../../fonts";

interface AnimatedArrowProps {
  direction: DirectionType;
  label: string;
  color: string;
}

export const AnimatedArrow: React.FC<AnimatedArrowProps> = ({
  direction,
  label,
  color,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Pulse animation
  const pulse = Math.sin((frame / fps) * Math.PI * 2) * 4;

  const arrowEntrance = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 80 },
  });

  const isIncoming = direction === "incoming";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 24px",
        borderRadius: 9999,
        background: `rgba(${isIncoming ? "56, 189, 248" : "52, 211, 153"}, 0.12)`,
        border: `1.5px solid ${color}`,
        boxShadow: `0 0 24px ${color}33`,
        transform: `scale(${arrowEntrance})`,
        opacity: arrowEntrance,
      }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transform: isIncoming
            ? `translateX(${-pulse}px) rotate(135deg)`
            : `translateX(${pulse}px) rotate(-45deg)`,
        }}
      >
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>

      <span
        style={{
          fontFamily: `${sansFamily}, sans-serif`,
          fontSize: 22,
          fontWeight: 700,
          color,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
};
