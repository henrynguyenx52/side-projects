import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { serifFamily } from "../fonts";

interface ExampleSentenceProps {
  example: string;
  highlightWord?: string;
}

export const ExampleSentence: React.FC<ExampleSentenceProps> = ({ example, highlightWord }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring starting frame 212
  const entrance = spring({
    frame: frame - 212,
    fps,
    config: { damping: 16, mass: 0.7, stiffness: 75 },
  });

  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const translateY = interpolate(entrance, [0, 1], [16, 0]);

  // Helper to split and highlight target word case-insensitively
  const renderHighlightedText = () => {
    if (!highlightWord) {
      return <span>“{example}”</span>;
    }

    const regex = new RegExp(`(${highlightWord})`, "gi");
    const parts = example.split(regex);

    return (
      <span>
        “
        {parts.map((part, i) => {
          const isMatch = part.toLowerCase() === highlightWord.toLowerCase();
          return isMatch ? (
            <span
              key={i}
              style={{
                color: "#818CF8",
                fontWeight: 600,
                borderBottom: "2px solid rgba(129, 140, 248, 0.5)",
                paddingBottom: 2,
                textShadow: "0 0 14px rgba(129, 140, 248, 0.4)",
              }}
            >
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          );
        })}
        ”
      </span>
    );
  };

  return (
    <div
      style={{
        maxWidth: 820,
        margin: "0 auto",
        textAlign: "center",
        opacity,
        transform: `translateY(${translateY}px)`,
        willChange: "transform, opacity",
      }}
    >
      <div
        style={{
          fontFamily: `${serifFamily}, Georgia, serif`,
          fontStyle: "italic",
          fontSize: 32,
          lineHeight: 1.6,
          color: "#94A3B8",
          letterSpacing: "0.01em",
        }}
      >
        {renderHighlightedText()}
      </div>
    </div>
  );
};

