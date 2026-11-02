import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { sansFamily, serifFamily } from "../../fonts";
import { glassCardStyle } from "../../config/design-system";

interface ExampleSentenceProps {
  sentence: string;
  targetWord: string;
  colorAccent: string;
}

export const ExampleSentence: React.FC<ExampleSentenceProps> = ({
  sentence,
  targetWord,
  colorAccent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - 12,
    fps,
    config: { damping: 16, mass: 0.8, stiffness: 75 },
  });

  const translateY = interpolate(entrance, [0, 1], [30, 0]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  // Highlight the target word in the sentence
  const regex = new RegExp(`(${targetWord})`, "gi");
  const parts = sentence.split(regex);

  return (
    <div
      style={{
        ...glassCardStyle,
        width: "100%",
        maxWidth: 920,
        padding: "30px 40px",
        boxSizing: "border-box",
        background: "rgba(15, 23, 42, 0.75)",
        transform: `translateY(${translateY}px)`,
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: `${sansFamily}, sans-serif`,
          fontSize: 15,
          fontWeight: 700,
          color: "#94A3B8",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          marginBottom: 10,
        }}
      >
        Natural Context Example
      </div>

      <div
        style={{
          fontFamily: `${serifFamily}, Georgia, serif`,
          fontSize: 32,
          fontStyle: "italic",
          lineHeight: 1.45,
          color: "#F8FAFC",
        }}
      >
        "{parts.map((part, i) =>
          regex.test(part) ? (
            <span
              key={i}
              style={{
                color: colorAccent,
                fontWeight: 700,
                textDecoration: "underline",
                textUnderlineOffset: "6px",
                textShadow: `0 0 20px ${colorAccent}66`,
              }}
            >
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}"
      </div>
    </div>
  );
};

